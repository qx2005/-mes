'use strict'

// Isolated regressions: no database writes, production requests or MQTT messages.
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { EventEmitter } = require('node:events')
const root = path.resolve(__dirname, '..')
const core = '../production-scheduling/flexible-line/src/'
const { alignToWorkingTime, addWorkingMinutes, findAvailableSlot } = require(core + 'scheduling/working-calendar')
const { generateFiniteCapacitySchedule } = require(core + 'scheduling/finite-capacity-scheduler')
const { configureEngine } = require(core + 'application/engine-service')
const { createProductionManagement } = require(core + 'application/production-management-service')
const { CATEGORY_TWO } = require(core + 'config/product-catalog')
const clock = { now: () => new Date('2026-09-07T08:00:00Z') }
let sequence = 0
const idGenerator = { next: prefix => prefix + '-' + ++sequence }
const daysOfWeek = [0, 1, 2, 3, 4, 5, 6]
const calendar = { id: 'CAL-DAY-SHIFT', shifts: [
  { daysOfWeek, start: '08:00', end: '12:00' },
  { daysOfWeek, start: '12:00', end: '17:00' }
] }

test('adjacent shifts preserve exact minute and second capacity', () => {
  assert.equal(addWorkingMinutes('2026-09-07T11:59:00Z', 2, calendar).toISOString(), '2026-09-07T12:01:00.000Z')
  assert.equal(addWorkingMinutes('2026-09-07T11:59:30Z', 1, calendar).toISOString(), '2026-09-07T12:00:30.000Z')
  assert.equal(alignToWorkingTime('2026-09-07T17:00:00Z', calendar).toISOString(), '2026-09-08T08:00:00.000Z')
})

test('calendar skips holidays, respects existing bookings and rejects malformed shifts', () => {
  const holiday = { ...calendar, excludedDates: ['2026-09-08'] }
  assert.equal(addWorkingMinutes('2026-09-07T16:59:00Z', 2, holiday).toISOString(), '2026-09-09T08:01:00.000Z')
  const slot = findAvailableSlot({ id: 'R', bookings: [{ start: '2026-09-07T12:00Z', end: '2026-09-07T12:30Z' }] }, '2026-09-07T11:59Z', 2, calendar)
  assert.equal(slot.start.toISOString(), '2026-09-07T12:30:00.000Z')
  assert.throws(() => alignToWorkingTime('invalid', calendar), { code: 'VALIDATION_ERROR' })
  assert.throws(() => alignToWorkingTime(clock.now(), { id: 'BAD', shifts: [{ daysOfWeek, start: '12:00', end: '08:00' }] }), { code: 'VALIDATION_ERROR' })
})

function parallelInput(allowOverdue = true) {
  const workOrder = { id: 'WO', productCode: 'BEER-02', plannedQuantity: 100, deadline: '2026-09-07T10:00:00Z', priority: 'critical' }
  const operations = ['SLOW', 'FAST'].map(code => ({ code, name: code, dependencies: [], eligibleResourceTypes: [code] }))
  const resourcePool = { calendars: [calendar], resources: operations.map((op, i) => ({
    id: op.code, name: op.code, enabled: true, resourceType: op.code,
    supportedProducts: ['BEER-02'], operationRates: { [op.code]: i ? 100 : 25 },
    availableAt: i ? '2026-09-07T08:00:00Z' : '2026-09-07T09:00:00Z'
  })) }
  return { workOrder, route: { operations }, resourcePool, clock, idGenerator,
    engineConfig: { ...configureEngine(workOrder, resourcePool, clock), allowOverdue } }
}

test('parallel schedule bounds include all operations and use the engine default calendar', () => {
  const plan = generateFiniteCapacitySchedule(parallelInput())
  assert.equal(plan.plannedStart, '2026-09-07T08:00:00.000Z')
  assert.equal(plan.plannedEnd, '2026-09-07T13:00:00.000Z')
  assert.equal(plan.overdueMinutes, 180)
  assert.throws(() => generateFiniteCapacitySchedule(parallelInput(false)), { code: 'DEADLINE_UNACHIEVABLE' })
})

function repository(key, finder) {
  const records = []
  return { records, [finder]: async value => records.find(row => row[key] === value),
    save: async row => { const i = records.findIndex(item => item.id === row.id); if (i < 0) records.push(row); else records[i] = row; return row } }
}

test('original BEER-02 workflow retains seven operations and reuses a repeated order', async () => {
  const reports = []
  const context = {
    clock, idGenerator,
    orderRepository: repository('externalOrderCode', 'findByExternalOrderCode'),
    workOrderRepository: repository('orderId', 'findByOrderId'),
    routeRepository: repository('workOrderId', 'findByWorkOrderId'),
    scheduleRepository: repository('workOrderId', 'findByWorkOrderId'),
    reportingRepository: { listByWorkOrderId: async id => reports.filter(row => row.workOrderId === id), saveAll: async rows => { reports.push(...rows); return rows } },
    resourceRepository: { listSchedulable: async () => ({ calendars: [calendar], resources: CATEGORY_TWO.operations.map(op => ({
      id: op.code, name: op.name, enabled: true, resourceType: op.eligibleResourceTypes[0],
      supportedProducts: ['BEER-02'], operationRates: { [op.code]: 1200 }
    })) }) }
  }
  const service = createProductionManagement(context)
  const order = { orderCode: 'AUDIT-ISOLATED', productCode: 'BEER-02', quantity: 100, deadline: '2026-09-09T17:00:00Z' }
  const first = await service.execute(order)
  const second = await service.execute(order)
  assert.equal(first.workOrder.status, 'SCHEDULED')
  assert.equal(first.reportingTasks.length, 7)
  assert.deepEqual(first.schedulePlan.operations.map(op => op.operationCode), CATEGORY_TWO.operations.map(op => op.code))
  assert.equal(first.schedulePlan.id, second.schedulePlan.id)
  assert.equal(reports.length, 7)
})

function browserScript(name, exports, overrides = {}) {
  const stored = new Map()
  const timers = []
  const document = { readyState: 'loading', cookie: '', documentElement: {},
    querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, getElementById: () => null }
  const sandbox = {
    document, location: { pathname: '/' }, history: { pushState() {}, replaceState() {} },
    MutationObserver: class { observe() {} },
    localStorage: { getItem: key => stored.get(key) || null, setItem: (key, value) => stored.set(key, value) },
    sessionStorage: { getItem: key => stored.get(key) || null, setItem: (key, value) => stored.set(key, value) },
    setTimeout: callback => timers.push(callback), setInterval: callback => timers.push(callback), clearTimeout() {}, clearInterval() {},
    addEventListener() {}, dispatchEvent() {},
    CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail } },
    fetch: async () => ({ ok: true, json: async () => ({ code: 200 }) }),
    ...overrides
  }
  sandbox.window = sandbox
  let source = fs.readFileSync(path.join(root, 'dist_mes/static/js', name), 'utf8')
  source = source.replace(/\}\)\(\)\s*$/, 'globalThis.exposed = {' + exports.join(',') + '};})()')
  vm.runInNewContext(source, sandbox, { filename: name })
  return { ...sandbox.exposed, sandbox, stored, timers }
}

test('import resolves the exact product code across paginated fuzzy results', async () => {
  const requests = []
  const script = browserScript('workorder-excel-import.js', ['findProduct'], { fetch: async url => {
    requests.push(url)
    return { ok: true, json: async () => ({ code: 200, total: 101, rows: requests.length === 1 ?
      Array.from({ length: 100 }, (_, i) => ({ itemCode: 'BEER-02-' + i, itemId: i })) : [{ itemCode: 'BEER-02', itemId: 101 }] }) }
  } })
  assert.equal((await script.findProduct({ '产品编号': 'BEER-02' })).itemId, 101)
  assert.equal(requests.length, 2)
})

test('import refuses to associate a different product returned by fuzzy search', async () => {
  const script = browserScript('workorder-excel-import.js', ['findProduct'], {
    fetch: async () => ({ ok: true, json: async () => ({ code: 200, rows: [{ itemCode: 'BEER-020', itemId: 1 }], total: 1 }) })
  })
  assert.equal(await script.findProduct({ '产品编号': 'BEER-02' }), null)
})

const chunkName = 'chunk-a5928174.products8-imagefix2-20260901.js'
function liveSubmit(issue, confirm = () => Promise.resolve()) {
  const source = fs.readFileSync(path.join(root, 'dist_mes/static/js', chunkName), 'utf8')
  const start = source.indexOf('submitOrder:function(){') + 'submitOrder:'.length
  const end = source.indexOf('}}}),p=m', start) + 1
  assert.ok(start > 0 && end > start, 'active scheduling method must be found')
  const events = [], warnings = [], successMessages = []
  const method = vm.runInNewContext('(' + source.slice(start, end) + ')', {
    l: { c: issue }, window: { dispatchEvent: event => events.push(event) },
    CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail } }
  })
  const model = { workorderList: [{ workorderId: 7, workorderCode: 'WO-7' }],
    productList: [{ name: '品类二' }], selectedProductIndex: 0, orderForm: { quantity: 10 },
    schedulePreview: { planCode: 'FSP-TEST', line: '柔性灌装线 A' },
    $refs: { orderForm: { validate: callback => callback(true) } },
    $modal: { confirm, msgWarning: text => warnings.push(text), msgSuccess: text => successMessages.push(text) } }
  return { submit: () => method.call(model), model, events, warnings, successMessages }
}
const flush = () => new Promise(resolve => setImmediate(resolve))

test('running bundle handles an empty workorder list without issuing a command', async () => {
  let calls = 0
  const fixture = liveSubmit(() => { calls++ })
  fixture.model.workorderList = []
  fixture.submit()
  await flush()
  assert.equal(calls, 0)
  assert.equal(fixture.warnings.length, 1)
})

test('running bundle prevents duplicate confirmations and sends one complete success event', async () => {
  let finishConfirm, calls = 0
  const fixture = liveSubmit(async id => { assert.equal(id, 7); calls++ },
    () => new Promise(resolve => { finishConfirm = resolve }))
  fixture.submit(); fixture.submit()
  await flush()
  assert.equal(calls, 0)
  fixture.model.productList[0].name = 'changed while confirming'
  finishConfirm()
  await flush()
  assert.equal(calls, 1)
  assert.equal(fixture.events.length, 1)
  assert.equal(fixture.events[0].type, 'flex-schedule-order-success')
  assert.equal(fixture.events[0].detail.product.name, '品类二')
  assert.equal(fixture.events[0].detail.schedule.planCode, 'FSP-TEST')
  assert.equal(fixture.successMessages[0], '柔性排产方案已下发：品类二')
  assert.equal(fixture.model.submitting, false)
})

test('cancelled or failed submissions release the lock without emitting success', async () => {
  for (const failAt of ['confirm', 'issue']) {
    const fixture = liveSubmit(() => Promise.reject(new Error('offline')),
      () => failAt === 'confirm' ? Promise.reject('cancel') : Promise.resolve())
    fixture.submit()
    await flush()
    assert.equal(fixture.events.length, 0)
    assert.equal(fixture.model.submitting, false)
  }
})

test('dashboard stays empty before dispatch and ignores old accumulated demo metrics', () => {
  const script = browserScript('dashboard-order-sync.js', ['readState', 'buildMetrics'])
  script.stored.set('mes-dashboard-order-runtime-v1', JSON.stringify({ dailyOutput: 20, monthlyOutput: 18660, monthlyPlan: 10 }))
  script.stored.set('mes-dashboard-dispatched-workorders-v2', 'null')
  const metrics = script.buildMetrics(script.readState())
  assert.equal(metrics.active, false)
  assert.equal(metrics.qualityRate, null)
  for (const field of ['dailyOutput', 'monthlyOutput', 'monthlyPlan', 'runningTime', 'energyKwh']) assert.equal(metrics[field], '-')
})

test('dashboard uses matched workorder quantities, not the hidden quantity input or duplicate events', () => {
  const script = browserScript('dashboard-order-sync.js', ['recordOrderSuccess'])
  const detail = { quantity: 10, workorder: { workorderId: 7, workorderCode: 'WO-7', quantity: 100, quantityProduced: 0 } }
  let metrics = script.recordOrderSuccess(detail)
  assert.equal(metrics.qualityRate, 100)
  assert.equal(metrics.monthlyPlan, 100)
  assert.equal(metrics.dailyOutput, 0)
  assert.equal(metrics.runningTime, '0min')
  metrics = script.recordOrderSuccess(detail)
  assert.equal(metrics.qualityRate, 100)
  assert.equal(metrics.monthlyPlan, 100)
  metrics = script.recordOrderSuccess({ workorder: { workorderId: 8, workorderCode: 'WO-8', quantity: 250, quantityProduced: 12 } })
  assert.equal(metrics.monthlyPlan, 350)
  assert.equal(metrics.dailyOutput, 12)
  assert.equal(metrics.monthlyOutput, 12)
})

test('dashboard polls current workorder production without writing quantity or status', async () => {
  const requests = []
  const script = browserScript('dashboard-order-sync.js', ['recordOrderSuccess', 'syncDispatchedOrders', 'readState', 'buildMetrics'], {
    fetch: async (url, config) => {
      requests.push({ url, config })
      return { ok: true, json: async () => ({ code: 200, data: { workorderId: 7, workorderCode: 'WO-7', quantity: 250, quantityProduced: 35 } }) }
    }
  })
  await script.syncDispatchedOrders()
  assert.equal(requests.length, 0)
  script.recordOrderSuccess({ quantity: 10, workorder: { workorderId: 7, quantity: 100, quantityProduced: 0 } })
  await script.syncDispatchedOrders()
  const metrics = script.buildMetrics(script.readState())
  assert.equal(metrics.monthlyPlan, 250)
  assert.equal(metrics.dailyOutput, 35)
  assert.equal(requests.length, 1)
  assert.equal(requests[0].url, '/prod-api/mes/pro/workorder/7')
  assert.ok(!requests[0].config.method || requests[0].config.method === 'GET')
  assert.equal(requests[0].config.body, undefined)
})

test('removed workorders stop contributing to dashboard metrics', async () => {
  const script = browserScript('dashboard-order-sync.js', ['recordOrderSuccess', 'syncDispatchedOrders', 'readState', 'buildMetrics'], {
    fetch: async () => ({ ok: true, json: async () => ({ code: 200, data: null }) })
  })
  script.recordOrderSuccess({ workorder: { workorderId: 7, quantity: 100 } })
  await script.syncDispatchedOrders()
  assert.equal(script.buildMetrics(script.readState()).active, false)
  assert.equal(script.buildMetrics(script.readState()).qualityRate, null)
})

test('inventory starts stocked and allocates against the actual workorder once', () => {
  const script = browserScript('dashboard-order-sync.js', ['recordOrderSuccess', 'buildMetrics', 'readState'])
  const initial = script.buildMetrics(script.readState()).inventory
  assert.equal(initial.active, false)
  assert.deepEqual(Array.from(initial.rows, row => row.remaining), [12000, 12000, 15000, 800])
  const detail = { quantity: 10, workorder: { workorderId: 7, workorderCode: 'WO-7', quantity: 100 } }
  const inventory = script.recordOrderSuccess(detail).inventory
  assert.equal(inventory.workorderCodes, 'WO-7')
  assert.deepEqual(Array.from(inventory.rows, row => row.remaining), [11900, 11900, 14900, 795])
  assert.deepEqual(script.recordOrderSuccess(detail).inventory, inventory)
  assert.deepEqual(script.buildMetrics(script.readState()).inventory, inventory)
  const combined = script.recordOrderSuccess({ workorder: { workorderId: 8, workorderCode: 'WO-8', quantity: 25 } }).inventory
  assert.equal(combined.orderCount, 2)
  assert.equal(combined.workorderCodes, 'WO-7、WO-8')
  assert.deepEqual(Array.from(combined.rows, row => row.remaining), [11875, 11875, 14875, 793])
})

test('inventory follows quantity corrections and deletion without cumulative deductions', async () => {
  let current = { workorderId: 7, workorderCode: 'WO-7', quantity: 50 }
  const script = browserScript('dashboard-order-sync.js', ['recordOrderSuccess', 'buildMetrics', 'readState', 'syncDispatchedOrders'], {
    fetch: async () => ({ ok: true, json: async () => ({ code: 200, data: current }) })
  })
  script.recordOrderSuccess({ workorder: { ...current, quantity: 100 } })
  await script.syncDispatchedOrders()
  await script.syncDispatchedOrders()
  assert.equal(script.buildMetrics(script.readState()).inventory.rows[0].remaining, 11950)
  current = null
  await script.syncDispatchedOrders()
  const restored = script.buildMetrics(script.readState()).inventory
  assert.equal(restored.active, false)
  assert.equal(restored.rows[0].remaining, 12000)
})

test('inventory exposes material shortages without negative stock or invalid allocations', () => {
  const script = browserScript('dashboard-order-sync.js', ['buildInventory'])
  const inventory = script.buildInventory({ orders: [
    { workorderId: 1, quantity: 13000 }, { workorderId: 1, quantity: 13000 },
    { workorderId: 2, quantity: 'bad' }, { workorderId: 3, quantity: -10 }
  ] })
  assert.equal(inventory.rows[0].remaining, 0)
  assert.equal(inventory.rows[0].allocated, 13000)
  assert.equal(inventory.rows[0].shortage, 1000)
  assert.equal(inventory.rows[2].remaining, 2000)
})

test('inventory table renders both states and treats workorder codes as text', () => {
  function element() {
    return { children: [], appendChild(child) { this.children.push(child) },
      set textContent(value) { this.text = value; this.children = [] }, get textContent() { return this.text } }
  }
  const body = element(), status = element()
  const script = browserScript('dashboard-order-sync.js', ['renderInventory', 'buildInventory'])
  script.sandbox.document.createElement = element
  const overlay = { querySelector: selector => selector.includes('tbody') ? body : status }
  script.renderInventory(overlay, script.buildInventory({ orders: [] }))
  assert.equal(body.children.length, 4)
  assert.equal(body.children[0].children[2].children[0].textContent, '待下单')
  assert.match(status.textContent, /备料就绪/)
  script.renderInventory(overlay, script.buildInventory({ orders: [{ workorderId: 7, workorderCode: '<WO-7>', quantity: 100 }] }))
  assert.equal(body.children.length, 4)
  assert.equal(body.children[0].children[2].children[0].textContent, '<WO-7>')
  assert.equal(body.children[0].children[3].children[0].textContent, '11900')
  assert.equal(body.children[0].children[3].children[1].textContent, '−100')
  assert.match(status.textContent, /已同步 1 张工单领料/)
})

test('demo notices show normal readiness and unique order-linked updates without alarm requests', () => {
  const script = browserScript('dashboard-order-sync.js', ['buildDemoNotices', 'recordOrderSuccess', 'readState'], {
    fetch: () => { throw new Error('Demo notices must not request devices or alarm services') }
  })
  const initial = script.buildDemoNotices(script.readState())
  assert.equal(initial.rows.length, 4)
  assert.ok(initial.rows.every(row => row.level === '正常'))
  const detail = { workorder: { workorderId: 7, workorderCode: 'WO-7', quantity: 100 } }
  const after = script.recordOrderSuccess(detail).notices
  assert.equal(after.active, true)
  assert.equal(after.rows.length, 7)
  assert.ok(after.rows.slice(0, 3).every(row => row.content.includes('WO-7')))
  assert.deepEqual(script.recordOrderSuccess(detail).notices, after)
  assert.deepEqual(script.buildDemoNotices(script.readState()), after)
  const many = script.buildDemoNotices({ orders: [1, 2, 3, 4, 4].map(id => ({ workorderId: id, dispatchedAt: 1000 * id })) })
  assert.equal(many.rows.length, 13)
  assert.equal(many.rows[0].id, '4-0')
  assert.equal(new Set(many.rows.map(row => row.id)).size, many.rows.length)
  assert.ok(many.rows.every(row => row.level === '正常'))
})

test('demo notice rendering safely displays order codes and preserves event time', () => {
  function element() {
    return { children: [], appendChild(child) { this.children.push(child) },
      set textContent(value) { this.text = value; this.children = [] }, get textContent() { return this.text } }
  }
  const body = element()
  const script = browserScript('dashboard-order-sync.js', ['buildDemoNotices', 'renderDemoNotices'])
  script.sandbox.document.createElement = element
  const timestamp = new Date(2026, 8, 5, 12, 34, 56).getTime()
  const notices = script.buildDemoNotices({ orders: [{ workorderId: 7, workorderCode: '<img onerror=bad>', dispatchedAt: timestamp }] })
  script.renderDemoNotices({ querySelector: () => body }, notices)
  assert.equal(body.children[0].children[1].textContent, '12:34:56')
  assert.equal(body.children[0].children[2].children[0].textContent, '正常')
  assert.equal(body.children[0].children[3].textContent, '工单 <img onerror=bad> 已接收')
  assert.equal(body.children[0].children[3].children.length, 0)
})

test('demo utilization switches with order workload, stays bounded and returns to idle on completion', () => {
  const script = browserScript('dashboard-order-sync.js', ['buildDemoUtilization', 'recordOrderSuccess', 'readState'], {
    fetch: () => { throw new Error('Utilization must not request real equipment') }
  })
  const initial = script.buildDemoUtilization({ orders: [] })
  assert.equal(initial.active, false)
  assert.equal(initial.average, 0)
  assert.match(initial.status, /待下单/)
  const detail = { workorder: { workorderId: 7, workorderCode: 'WO-7', quantity: 100, quantityProduced: 0 } }
  const active = script.recordOrderSuccess(detail).utilization
  assert.equal(active.active, true)
  assert.equal(active.workorderCodes, 'WO-7')
  assert.equal(active.average, 88)
  assert.deepEqual(Array.from(active.devices, device => device.rate), [87, 91, 85, 89])
  assert.deepEqual(script.recordOrderSuccess(detail).utilization, active)
  assert.deepEqual(script.buildDemoUtilization(script.readState()), active)
  const completed = script.recordOrderSuccess({ workorder: { ...detail.workorder, quantityProduced: 100 } }).utilization
  assert.equal(completed.average, 0)
  assert.match(completed.status, /已完成/)
  const more = script.recordOrderSuccess({ workorder: { workorderId: 8, workorderCode: 'WO-8', quantity: 1000000 } }).utilization
  assert.equal(more.workorderCodes, 'WO-8')
  assert.ok(more.devices.every(device => device.rate > 0 && device.rate <= 100))
  assert.equal(script.buildDemoUtilization({ orders: [{ workorderId: 1, quantity: 'bad' }] }).average, 0)
})

test('reset selects imported demo records and preserves formal orders and referenced products', () => {
  const script = browserScript('demo-session-reset.js', ['selectPlan', 'clearDemoStorage'])
  const plan = script.selectPlan(
    [{ workorderId: 1, attr1: 'EXCEL_IMPORT', productId: 10 }, { workorderId: 2, productId: 11 }],
    [{ recordId: 1, workorderId: 1 }, { recordId: 2, workorderId: 2 },
      { recordId: 3, feedbackChannel: 'AUTO_SCHEDULE', remark: '由柔性排产方案 FSP-1 自动生成' }],
    [{ taskId: 1, workorderId: 1 }, { taskId: 2, workorderId: 2 }],
    [{ itemId: 10, attr1: 'EXCEL_IMPORT' }, { itemId: 11, attr1: 'EXCEL_IMPORT' }, { itemId: 12 }])
  assert.deepEqual(Array.from(plan.workorders, row => row.workorderId), [1])
  assert.deepEqual(Array.from(plan.feedback, row => row.recordId), [1, 3])
  assert.deepEqual(Array.from(plan.tasks, row => row.taskId), [1])
  assert.deepEqual(Array.from(plan.products, row => row.itemId), [10])
  const deleted = []
  script.sandbox.sessionStorage.removeItem = script.sandbox.localStorage.removeItem = key => deleted.push(key)
  script.clearDemoStorage()
  assert.equal(deleted.length, 5)
  assert.ok(!deleted.some(key => /Token|theme/.test(key)))
  assert.ok(deleted.includes('mes-online-ide-plugin'))
})

function resetFixture() {
  const records = {
    '/mes/pro/workorder': [{ workorderId: 7, workorderCode: 'DEMO', productId: 8, quantity: 100, status: 'CONFIRMED', attr1: 'EXCEL_IMPORT', createTime: 'fixed' }],
    '/mes/pro/feedback': [{ recordId: 9, workorderId: 7 }],
    '/mes/pro/protask': [{ taskId: 10, workorderId: 7 }],
    '/mes/md/mditem': [{ itemId: 8, attr1: 'EXCEL_IMPORT' }]
  }
  const calls = []
  const idFields = { '/mes/pro/workorder': 'workorderId', '/mes/pro/feedback': 'recordId', '/mes/pro/protask': 'taskId', '/mes/md/mditem': 'itemId' }
  const script = browserScript('demo-session-reset.js', ['preparePlan', 'executePlan'], {
    fetch: async (url, config) => {
      const route = url.replace('/prod-api', '').split('?')[0]
      const method = config.method || 'GET'
      calls.push({ route, method, body: config.body })
      if (route.startsWith('/ide/mes-sandbox/')) {
        return { ok: true, json: async () => ({ code: 200, data: { id: 'fixed-ide-baseline', fileCount: 2 } }) }
      }
      let body = { code: 200 }
      const base = route.replace(/\/(list|\d+)$/, '')
      if (route.endsWith('/list')) {
        body = base === '/mes/pro/workorder' ? { code: 200, data: records[base].slice() } : { code: 200, rows: records[base].slice(), total: records[base].length }
      } else if (method === 'GET') {
        body.data = records[base].find(row => String(row[idFields[base]]) === route.split('/').pop())
      } else if (method === 'DELETE') {
        records[base] = records[base].filter(row => String(row[idFields[base]]) !== route.split('/').pop())
      } else if (method === 'PUT') {
        const updated = JSON.parse(config.body)
        records[route] = records[route].map(row => row.workorderId === updated.workorderId ? updated : row)
      } else throw new Error('Unexpected operation')
      return { ok: true, json: async () => body }
    }
  })
  return { script, records, calls }
}

test('reset uses normal CRUD in dependency order without production execution', async () => {
  const { script, records, calls } = resetFixture()
  const plan = await script.preparePlan()
  assert.ok(calls.every(call => call.method === 'GET'))
  await script.executePlan(plan, () => {})
  assert.ok(Object.values(records).every(rows => rows.length === 0))
  assert.deepEqual(calls.filter(call => call.method === 'DELETE').map(call => call.route),
    ['/mes/pro/feedback/9', '/mes/pro/protask/10', '/mes/pro/workorder/7', '/mes/md/mditem/8'])
  const update = calls.find(call => call.method === 'PUT')
  assert.equal(update.route, '/mes/pro/workorder')
  assert.equal(JSON.parse(update.body).status, 'PREPARE')
  assert.equal(JSON.parse(update.body).quantity, 100)
  assert.ok(!calls.some(call => call.method === 'PUT' && /\/\d+$/.test(call.route)))
  assert.ok(calls.some(call => call.method === 'POST' && call.route === '/ide/mes-sandbox/demo-reset'))
})

test('reset rejects a stale preview before making any backend changes', async () => {
  const { script, records, calls } = resetFixture()
  const plan = await script.preparePlan()
  records['/mes/pro/workorder'] = [{ ...records['/mes/pro/workorder'][0], quantity: 200 }]
  await assert.rejects(script.executePlan(plan, () => {}), /数据已变化/)
  assert.ok(calls.every(call => call.method === 'GET'))
})

test('reset pause stops delayed feedback callbacks and dashboard success events', async () => {
  const feedback = browserScript('schedule-feedback-link.js', ['createFeedbackOrder', 'readOrders'], {
    fetch: () => { throw new Error('No request during reset') }
  })
  feedback.createFeedbackOrder({ workorder: { workorderId: 7 }, schedule: { planCode: 'DEMO' } })
  feedback.sandbox.__MES_DEMO_RESETTING__ = true
  feedback.timers[0]()
  await feedback.sandbox.__MES_WAIT_FOR_FEEDBACK_SYNC__()
  feedback.createFeedbackOrder({ workorder: { workorderId: 8 }, schedule: { planCode: 'LATE' } })
  assert.equal(feedback.readOrders().length, 1)
  const dashboard = browserScript('dashboard-order-sync.js', ['handleOrderSuccess', 'readState'])
  dashboard.sandbox.__MES_DEMO_RESETTING__ = true
  await dashboard.handleOrderSuccess({ detail: { workorder: { workorderId: 7, quantity: 100 } } })
  assert.equal(dashboard.readState().orders.length, 0)
})

test('full browser storage does not interrupt feedback creation or duplicate a plan', () => {
  const script = browserScript('schedule-feedback-link.js', ['createFeedbackOrder', 'readOrders'], {
    localStorage: { getItem: () => null, setItem() { throw new Error('QuotaExceededError') } }
  })
  const detail = { quantity: 10, product: { name: '品类二' }, workorder: { workorderId: 7 }, schedule: { planCode: 'UNIQUE' } }
  script.createFeedbackOrder(detail); script.createFeedbackOrder(detail)
  assert.equal(script.readOrders().length, 1)
  assert.equal(script.timers.length, 1)
})

test('a failed storage write cannot restore an older dashboard or feedback snapshot', () => {
  const storage = { getItem: () => '[]', setItem() { throw new Error('QuotaExceededError') } }
  const feedback = browserScript('schedule-feedback-link.js', ['createFeedbackOrder', 'readOrders'], { localStorage: storage })
  feedback.createFeedbackOrder({ workorder: { workorderId: 7 }, schedule: { planCode: 'PERSIST-IN-MEMORY' } })
  assert.equal(feedback.readOrders().length, 1)
  const dashboard = browserScript('dashboard-order-sync.js', ['recordOrderSuccess'], { sessionStorage: storage })
  dashboard.recordOrderSuccess({ workorder: { workorderId: 1, quantity: 100, quantityProduced: 10 } })
  assert.equal(dashboard.recordOrderSuccess({ workorder: { workorderId: 2, quantity: 100, quantityProduced: 10 } }).dailyOutput, 20)
})

test('closing or retrying the IDE invalidates outstanding health responses', async () => {
  const source = fs.readFileSync(path.join(root, 'dist_mes/static/js/platform-updater.js'), 'utf8')
  const start = source.indexOf('    function connectTheia()')
  const end = source.indexOf('    function startHealthMonitor()', start)
  const responses = [], timers = [], states = []
  const sandbox = { closed: false, connectionGeneration: 0, connectTimer: null, healthTimer: null,
    config: { ideUrl: '/ide' }, iframe: { removeAttribute() { this.src = '' } },
    showConnectionState: state => states.push(state),
    fetch: () => new Promise(resolve => responses.push(resolve)),
    clearTimeout() {}, setTimeout: callback => timers.push(callback) }
  sandbox.window = sandbox
  vm.runInNewContext(source.slice(start, end), sandbox)
  sandbox.connectTheia()
  sandbox.connectTheia()
  const healthy = { ok: true, json: async () => ({ ok: true, service: 'mes-embedded-theia' }) }
  responses[0](healthy)
  await flush()
  assert.equal(sandbox.iframe.src, '')
  assert.equal(timers.length, 0)
  sandbox.closed = true
  responses[1](healthy)
  await flush()
  assert.equal(sandbox.iframe.src, '')
  assert.equal(timers.length, 0)
  assert.deepEqual(states, ['loading', 'loading'])
})

test('route QR labels escape markup and row reuse reads current cell values', () => {
  const script = browserScript('route-qrcode-view.js', ['escapeHtml', 'readRowData'])
  assert.equal(script.escapeHtml('<img src=x onerror="x">'), '&lt;img src=x onerror=&quot;x&quot;&gt;')
  const cells = ['OLD', '旧路线'].map(textContent => ({ textContent, querySelector: () => null }))
  const row = { querySelectorAll: () => cells }
  assert.equal(script.readRowData(row).routeCode, 'OLD')
  cells[0].textContent = 'NEW'
  assert.equal(script.readRowData(row).routeCode, 'NEW')
})

function mqttModule() {
  const clients = []
  const mqtt = { connect() {
    const client = new EventEmitter()
    client.connected = false
    client.end = () => { client.ended = true }
    client.publish = (_topic, _payload, _options, callback) => callback()
    clients.push(client)
    return client
  } }
  const module = { exports: {} }
  vm.runInNewContext(fs.readFileSync(path.join(root, 'production-order-portable/bridge/lib/mqttPublisher.js'), 'utf8'), {
    module, require: name => { assert.equal(name, 'mqtt'); return mqtt }, setTimeout, clearTimeout
  })
  return { ...module.exports, clients }
}
const mqttConfig = { hostUrl: 'mqtt://isolated-test', timeout: 0.02 }

test('MQTT connection timeout ends the orphan client and permits a fresh retry', async () => {
  const script = mqttModule()
  await assert.rejects(script.publishProductionStart(mqttConfig, 7, { quantity: 10 }), /timed out/)
  assert.equal(script.clients[0].ended, true)
  const retry = script.publishProductionStart(mqttConfig, 7, { quantity: 10 })
  script.clients[1].connected = true
  script.clients[1].emit('connect')
  assert.equal((await retry).payload.rw_prot.w_data[1].value, '10')
})

test('MQTT failure closes the failed client; reconnect reuses an existing client', async () => {
  const script = mqttModule()
  const first = script.publishProductionStart(mqttConfig, 7, { quantity: 10 })
  script.clients[0].emit('error', new Error('offline'))
  await assert.rejects(first, /offline/)
  assert.equal(script.clients[0].ended, true)
  const retry = script.publishProductionStart(mqttConfig, 7, { quantity: 10 })
  script.clients[1].connected = true; script.clients[1].emit('connect'); await retry
  script.clients[1].connected = false
  const reconnect = script.publishProductionStart(mqttConfig, 7, { quantity: 10 })
  assert.equal(script.clients.length, 2)
  script.clients[1].connected = true; script.clients[1].emit('connect'); await reconnect
})

test('invalid or completed workorders cannot send negative/NaN quantities to MQTT', async () => {
  const script = mqttModule()
  for (const workorder of [{ quantity: 5, quantity_produced: 8 }, { quantity: 'bad' }, { quantity: 0 }]) {
    await assert.rejects(script.publishProductionStart(mqttConfig, 7, workorder), /remaining production quantity/)
  }
  assert.equal(script.clients.length, 0)
})
