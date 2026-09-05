(function () {
  'use strict'

  var STORAGE_KEY = 'mes-dashboard-dispatched-workorders-v2'
  var OVERLAY_ID = 'mes-dashboard-runtime-overlay'
  var STYLE_ID = 'mes-dashboard-runtime-style'
  var lastRenderedKey = ''
  var mountTimer = null
  var boundsTimer = null
  var overlayResizeObserver = null
  var memoryState = {}
  var storageUnavailable = false
  var pendingSync = null
  var demoOpenedAt = Date.now()
  // Demo allocation only: the dashboard never changes real warehouse records.
  var MATERIAL_STOCK = [
    { code: 'CAN', warehouse: '包材仓', name: '灌装空罐', opening: 12000, packSize: 1 },
    { code: 'LID', warehouse: '包材仓', name: '易拉罐盖', opening: 12000, packSize: 1 },
    { code: 'LABEL', warehouse: '辅料仓', name: '产品标签', opening: 15000, packSize: 1 },
    { code: 'CARTON', warehouse: '包装仓', name: '包装纸箱', opening: 800, packSize: 24 }
  ]

  function pad(value) { return String(value).padStart(2, '0') }

  function monthKey(date) {
    return date.getFullYear() + '-' + pad(date.getMonth() + 1)
  }

  function dayKey(date) {
    return monthKey(date) + '-' + pad(date.getDate())
  }

  function readState() {
    var state = memoryState
    try {
      var raw = storageUnavailable ? null : sessionStorage.getItem(STORAGE_KEY)
      if (raw) state = JSON.parse(raw)
    } catch (error) { /* Continue with this page's state if browser storage is unavailable. */ }
    if (!state || typeof state !== 'object' || Array.isArray(state)) state = {}
    state = Object.assign({}, state)
    state.orders = Array.isArray(state.orders) ? state.orders.filter(function (order) {
      return order && order.workorderId && Number.isFinite(order.dispatchedAt)
    }) : []
    return state
  }

  function writeState(state) {
    memoryState = state
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state)) }
    catch (error) { storageUnavailable = true }
  }

  function getToken() {
    var match = document.cookie.match(/(?:^|;\s*)Admin-Token=([^;]+)/)
    return match ? decodeURIComponent(match[1]) : ''
  }

  function request(url, options) {
    var config = Object.assign({}, options || {})
    config.headers = Object.assign({ 'Content-Type': 'application/json;charset=UTF-8' }, config.headers || {})
    var token = getToken()
    if (token) config.headers.Authorization = 'Bearer ' + token
    return fetch('/prod-api' + url, config).then(function (response) {
      return response.json().then(function (body) {
        if (!response.ok || (body.code !== undefined && body.code !== 200)) {
          throw new Error(body.msg || 'Request failed')
        }
        return body
      })
    })
  }

  function quantityValue(value) {
    var quantity = Number(value)
    return Number.isFinite(quantity) && quantity >= 0 ? quantity : 0
  }

  function formatRunningTime(startedAt) {
    if (!startedAt) return '0h'
    var minutes = Math.max(0, Math.floor((Date.now() - startedAt) / 60000))
    if (minutes < 60) return minutes + 'min'
    return (minutes / 60).toFixed(1) + 'h'
  }

  function buildInventory(state) {
    var seen = Object.create(null)
    var orders = (state.orders || []).filter(function (order) {
      if (!order || !order.workorderId || seen[String(order.workorderId)]) return false
      seen[String(order.workorderId)] = true
      return true
    })
    return {
      active: orders.length > 0,
      orderCount: orders.length,
      workorderCodes: orders.map(function (order) { return order.workorderCode || String(order.workorderId) }).join('、'),
      rows: MATERIAL_STOCK.map(function (material) {
        var allocated = orders.reduce(function (total, order) {
          return total + Math.ceil(quantityValue(order.quantity) / material.packSize)
        }, 0)
        return Object.assign({}, material, {
          allocated: allocated,
          remaining: Math.max(0, material.opening - allocated),
          shortage: Math.max(0, allocated - material.opening)
        })
      })
    }
  }

  // Informational demo rows only; no alarm API, equipment reads or acknowledgements.
  function buildDemoNotices(state) {
    var seen = Object.create(null)
    var orders = (state.orders || []).filter(function (order) {
      if (!order || !order.workorderId || !Number.isFinite(order.dispatchedAt) || seen[String(order.workorderId)]) return false
      seen[String(order.workorderId)] = true
      return true
    }).sort(function (a, b) { return b.dispatchedAt - a.dispatchedAt })
    var rows = []
    orders.slice(0, 3).forEach(function (order) {
      var code = order.workorderCode || String(order.workorderId)
      ;['工单 ' + code + ' 已接收', '工单 ' + code + ' 物料库存已同步', '工单 ' + code + ' 生产计划已同步'].forEach(function (content, index) {
        rows.push({ id: String(order.workorderId) + '-' + index, timestamp: order.dispatchedAt, level: '正常', content: content })
      })
    })
    var startedAt = Number.isFinite(state.demoOpenedAt) ? state.demoOpenedAt : orders.reduce(function (earliest, order) {
      return Math.min(earliest, order.dispatchedAt)
    }, demoOpenedAt)
    ;['演示系统已就绪，等待工单下发', '物料备料数据已加载', '生产看板同步模块已就绪', '演示运行正常，暂无报警'].forEach(function (content, index) {
      rows.push({ id: 'ready-' + index, timestamp: startedAt, level: '正常', content: content })
    })
    return { active: orders.length > 0, rows: rows }
  }

  function buildDemoUtilization(state) {
    var seen = Object.create(null)
    var orders = (state.orders || []).filter(function (order) {
      if (!order || !order.workorderId || seen[String(order.workorderId)]) return false
      seen[String(order.workorderId)] = true
      return true
    })
    var pending = orders.filter(function (order) {
      return quantityValue(order.quantity) > quantityValue(order.quantityProduced)
    })
    var active = pending.length > 0
    var remaining = pending.reduce(function (total, order) {
      return total + quantityValue(order.quantity) - quantityValue(order.quantityProduced)
    }, 0)
    // Deterministic demo load, not measured machine utilization or completion rate.
    var load = Math.min(6, Math.ceil(remaining / 100))
    var devices = [
      { name: '灌装单元', base: 86 }, { name: '封装单元', base: 90 },
      { name: '检测单元', base: 84 }, { name: '码垛单元', base: 88 }
    ].map(function (device) {
      return { name: device.name, rate: active ? device.base + load : 0 }
    })
    return {
      active: active,
      status: active ? '运行中' : orders.length ? '已完成 · 待机' : '待下单 · 待机',
      workorderCodes: (active ? pending : orders).map(function (order) { return order.workorderCode || String(order.workorderId) }).join('、'),
      average: devices.reduce(function (total, device) { return total + device.rate }, 0) / devices.length,
      devices: devices
    }
  }

  function buildMetrics(state) {
    var orders = state.orders || []
    var today = dayKey(new Date())
    var month = monthKey(new Date())
    var daily = orders.filter(function (order) { return dayKey(new Date(order.dispatchedAt)) === today })
    var monthly = orders.filter(function (order) { return monthKey(new Date(order.dispatchedAt)) === month })
    function sum(rows, field) {
      return rows.reduce(function (total, order) { return total + quantityValue(order[field]) }, 0)
    }
    var active = orders.length > 0
    var dailyOutput = sum(daily, 'quantityProduced')
    var startedAt = orders.reduce(function (earliest, order) { return Math.min(earliest, order.dispatchedAt) }, Infinity)
    return {
      active: active,
      dailyOutput: active ? dailyOutput : '-',
      qualityRate: active ? 100 : null,
      monthlyOutput: active ? sum(monthly, 'quantityProduced') : '-',
      monthlyPlan: active ? sum(monthly, 'quantity') : '-',
      runningTime: active ? formatRunningTime(startedAt) : '-',
      energyKwh: active ? (118 + dailyOutput * 1.26).toFixed(1) : '-',
      inventory: buildInventory(state),
      notices: buildDemoNotices(state),
      utilization: buildDemoUtilization(state),
      workorderCodes: orders.map(function (order) { return order.workorderCode }).join('、')
    }
  }

  function metricsKey(metrics) {
    return [
      metrics.active,
      metrics.qualityRate,
      metrics.workorderCodes,
      metrics.dailyOutput,
      metrics.monthlyOutput,
      metrics.monthlyPlan,
      metrics.runningTime,
      metrics.energyKwh,
      JSON.stringify(metrics.inventory),
      JSON.stringify(metrics.notices),
      JSON.stringify(metrics.utilization)
    ].join('|')
  }

  function recordOrderSuccess(detail) {
    detail = detail || {}
    var workorder = detail.workorder || {}
    var workorderId = workorder.workorderId || detail.workorderId
    var state = readState()
    if (!workorderId) return buildMetrics(state)
    if (!Number.isFinite(state.demoOpenedAt)) state.demoOpenedAt = demoOpenedAt
    var existing = state.orders.find(function (order) { return String(order.workorderId) === String(workorderId) })
    var order = Object.assign({}, workorder, {
      workorderId: workorderId,
      workorderCode: workorder.workorderCode || (existing && existing.workorderCode) || String(workorderId),
      quantity: quantityValue(workorder.quantity),
      quantityProduced: quantityValue(workorder.quantityProduced),
      dispatchedAt: existing ? existing.dispatchedAt : Date.now()
    })
    state.orders = state.orders.filter(function (item) { return String(item.workorderId) !== String(workorderId) })
    state.orders.push(order)
    writeState(state)
    return buildMetrics(state)
  }

  function syncDispatchedOrders() {
    if (window.__MES_DEMO_RESETTING__) return Promise.resolve(false)
    if (pendingSync) return pendingSync
    var orders = readState().orders
    if (!orders.length) return Promise.resolve(false)
    pendingSync = Promise.all(orders.map(function (order) {
      return request('/mes/pro/workorder/' + encodeURIComponent(order.workorderId)).then(function (body) {
        var current = body.data
        if (!current || String(current.workorderId) !== String(order.workorderId) ||
            (order.createTime && current.createTime !== order.createTime)) return { id: order.workorderId, removed: true }
        return { id: order.workorderId, current: Object.assign({}, current, { dispatchedAt: order.dispatchedAt }) }
      }).catch(function () { return { id: order.workorderId, failed: true } })
    })).then(function (updates) {
      if (window.__MES_DEMO_RESETTING__) return false
      var state = readState()
      var before = JSON.stringify(state.orders)
      state.orders = state.orders.map(function (order) {
        var update = updates.find(function (item) { return String(item.id) === String(order.workorderId) })
        return !update || update.failed ? order : update.removed ? null : update.current
      }).filter(Boolean)
      writeState(state)
      return before !== JSON.stringify(state.orders)
    }).finally(function () { pendingSync = null })
    return pendingSync
  }

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return
    var style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent =
      '#' + OVERLAY_ID + '{position:absolute;pointer-events:none;z-index:5;font-family:"Microsoft YaHei",sans-serif;overflow:hidden;}' +
      '#' + OVERLAY_ID + ' .mes-kpi-strip{position:absolute;inset:0;}' +
      '#' + OVERLAY_ID + ' .mes-kpi-value-slot{position:absolute;top:55.7%;transform:translate(-50%,-50%);display:flex;justify-content:center;align-items:center;min-width:72px;min-height:30px;padding:2px 10px;color:#fff;font-size:clamp(18px,1.45vw,28px);font-weight:700;line-height:1;text-align:center;white-space:nowrap;background:#03111f;border-radius:4px;text-shadow:0 0 12px rgba(45,184,255,.28);}' +
      '#' + OVERLAY_ID + ' .mes-kpi-value-slot:nth-child(1){left:32.71%;}' +
      '#' + OVERLAY_ID + ' .mes-kpi-value-slot:nth-child(2){left:44.07%;}' +
      '#' + OVERLAY_ID + ' .mes-kpi-value-slot:nth-child(3){left:55.00%;}' +
      '#' + OVERLAY_ID + ' .mes-kpi-value-slot:nth-child(4){left:66.35%;}' +
      '#' + OVERLAY_ID + ' .mes-energy-grid{position:absolute;left:1.4%;top:80.8%;width:22.8%;height:15.5%;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));grid-template-rows:repeat(2,minmax(0,1fr));gap:8px;}' +
      '#' + OVERLAY_ID + ' .mes-energy-item{display:flex;flex-direction:column;justify-content:center;align-items:center;background:rgba(3,17,31,.9);border:1px solid rgba(65,200,255,.25);border-radius:6px;padding:6px 4px;box-shadow:inset 0 0 14px rgba(26,143,204,.05);}' +
      '#' + OVERLAY_ID + ' .mes-energy-item span{color:#8eb6d8;font-size:11px;line-height:1.2;margin-bottom:4px;}' +
      '#' + OVERLAY_ID + ' .mes-energy-item strong{color:#fff;font-size:clamp(14px,1.1vw,18px);font-weight:700;line-height:1.1;}' +
      '#' + OVERLAY_ID + ' .mes-material-stock{position:absolute;left:1.4%;top:42.5%;width:25.5%;height:23.7%;background:#03111f;pointer-events:auto;overflow:auto;scrollbar-width:thin;box-sizing:border-box;color:#c4e7fb;font-size:clamp(8px,.67vw,12px);}' +
      '#' + OVERLAY_ID + ' .mes-material-stock table{width:100%;table-layout:fixed;border-collapse:collapse;text-align:center;}' +
      '#' + OVERLAY_ID + ' .mes-material-stock th{height:1.9em;background:#08293e;color:#fff;font-size:.88em;}' +
      '#' + OVERLAY_ID + ' .mes-material-stock td{height:2.8em;padding:2px;border-bottom:1px solid #123046;}' +
      '#' + OVERLAY_ID + ' .mes-material-stock tr:nth-child(even){background:#061c2b;}' +
      '#' + OVERLAY_ID + ' .mes-stock-code{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.85em;color:#7bd6ee;}' +
      '#' + OVERLAY_ID + ' .mes-stock-remaining{color:#fff;font-weight:600;}' +
      '#' + OVERLAY_ID + ' .mes-stock-delta{margin-left:4px;color:#ffc46b;font-size:.85em;white-space:nowrap;}' +
      '#' + OVERLAY_ID + ' .mes-stock-shortage{color:#ff7777;}' +
      '#' + OVERLAY_ID + ' .mes-stock-status{margin:0;padding:.8em .5em;line-height:1.6;font-size:.85em;color:#8eb6d8;text-align:center;}' +
      '#' + OVERLAY_ID + ' .mes-stock-status.is-active{color:#36e2cf;}' +
      '#' + OVERLAY_ID + ' .mes-demo-notices{position:absolute;left:28.8%;top:70.5%;width:42.2%;height:27.8%;box-sizing:border-box;display:flex;flex-direction:column;background:#03111f;color:#c4e7fb;font-size:clamp(9px,.72vw,13px);pointer-events:auto;}' +
      '#' + OVERLAY_ID + ' .mes-notice-scroll{flex:1;min-height:0;overflow:auto;scrollbar-width:thin;scrollbar-color:#18516a #03111f;}' +
      '#' + OVERLAY_ID + ' .mes-demo-notices table{width:100%;table-layout:fixed;border-collapse:collapse;text-align:center;}' +
      '#' + OVERLAY_ID + ' .mes-demo-notices th{position:sticky;top:0;height:2em;background:#08293e;color:#fff;font-size:.88em;}' +
      '#' + OVERLAY_ID + ' .mes-demo-notices td{height:2.65em;padding:3px 5px;border-bottom:1px solid #123046;}' +
      '#' + OVERLAY_ID + ' .mes-demo-notices tr:nth-child(even){background:#061c2b;}' +
      '#' + OVERLAY_ID + ' .mes-notice-content{text-align:left;overflow-wrap:anywhere;}' +
      '#' + OVERLAY_ID + ' .mes-notice-level{display:inline-block;padding:2px 8px;border:1px solid #1c655e;border-radius:3px;background:#07302f;color:#40e1ba;font-size:.9em;white-space:nowrap;}' +
      '#' + OVERLAY_ID + ' .mes-notice-summary{flex:none;margin:0;padding:7px 10px;border-top:1px solid #123046;color:#8eb6d8;font-size:.85em;display:flex;justify-content:space-between;gap:8px;}' +
      '#' + OVERLAY_ID + ' .mes-notice-summary strong{color:#40e1ba;font-weight:400;}' +
      '#' + OVERLAY_ID + ' .mes-demo-utilization{position:absolute;left:73%;top:70.5%;width:25.5%;height:27.8%;box-sizing:border-box;display:flex;flex-direction:column;padding:6px 10px;background:#03111f;color:#c4e7fb;pointer-events:auto;overflow:auto;scrollbar-width:thin;font-size:clamp(9px,.72vw,13px);}' +
      '#' + OVERLAY_ID + ' .mes-utilization-summary{display:flex;align-items:center;justify-content:space-between;gap:8px;padding-bottom:6px;border-bottom:1px solid #123046;}' +
      '#' + OVERLAY_ID + ' .mes-utilization-summary strong{font-size:clamp(16px,1.4vw,24px);color:#8eb6d8;margin-left:7px;}' +
      '#' + OVERLAY_ID + ' .is-running .mes-utilization-summary strong{color:#30e2ef;}' +
      '#' + OVERLAY_ID + ' [data-utilization-status]{font-size:.85em;color:#8eb6d8;white-space:nowrap;}' +
      '#' + OVERLAY_ID + ' .is-running [data-utilization-status]{color:#40e1ba;}' +
      '#' + OVERLAY_ID + ' .mes-utilization-devices{display:flex;flex:1;flex-direction:column;justify-content:space-evenly;min-height:8.5em;padding:4px 0;}' +
      '#' + OVERLAY_ID + ' .mes-utilization-row{display:grid;grid-template-columns:5em minmax(0,1fr) 3em;align-items:center;gap:8px;min-height:1.8em;}' +
      '#' + OVERLAY_ID + ' .mes-utilization-track{height:7px;background:#102f43;border-radius:6px;overflow:hidden;}' +
      '#' + OVERLAY_ID + ' .mes-utilization-fill{display:block;height:100%;background:linear-gradient(90deg,#208ef5,#25e3c9);border-radius:6px;transition:width .45s ease;}' +
      '#' + OVERLAY_ID + ' .mes-utilization-rate{color:#fff;text-align:right;font-variant-numeric:tabular-nums;}' +
      '#' + OVERLAY_ID + ' .mes-utilization-footer{border-top:1px solid #123046;padding-top:5px;color:#8eb6d8;font-size:.8em;line-height:1.6;}' +
      '#' + OVERLAY_ID + ' [data-utilization-orders]{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#7bd6ee;}' +
      '#' + OVERLAY_ID + ' .mes-demo-quality{position:absolute;left:73%;top:42.5%;width:25.5%;height:23.7%;display:flex;flex-direction:column;background:#03111f;color:#c4e7fb;box-sizing:border-box;pointer-events:auto;font-size:clamp(9px,.72vw,13px);}' +
      '#' + OVERLAY_ID + ' .mes-quality-visual{flex:1;min-height:0;display:flex;align-items:center;justify-content:center;}' +
      '#' + OVERLAY_ID + ' .mes-quality-ring{height:80%;aspect-ratio:1;box-sizing:border-box;border:clamp(6px,.7vw,12px) solid #219cf3;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;box-shadow:0 0 15px rgba(33,156,243,.12);}' +
      '#' + OVERLAY_ID + ' .mes-quality-ring strong{font-size:clamp(18px,1.6vw,28px);color:#fff;line-height:1.3;}' +
      '#' + OVERLAY_ID + ' .mes-quality-ring span{color:#5edce9;font-size:.9em;}' +
      '#' + OVERLAY_ID + ' .mes-quality-empty{display:none;color:#c4e7fb;font-size:clamp(11px,.85vw,15px);}' +
      '#' + OVERLAY_ID + ' .mes-quality-caption{flex:none;text-align:center;color:#8eb6d8;font-size:.8em;line-height:1.6;padding:0 8px 5px;}' +
      '#' + OVERLAY_ID + ' [data-quality-orders]{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#7bd6ee;}' +
      '#' + OVERLAY_ID + ' .mes-demo-quality.is-empty .mes-quality-ring,#' + OVERLAY_ID + ' .mes-demo-quality.is-empty .mes-quality-caption{display:none;}' +
      '#' + OVERLAY_ID + ' .mes-demo-quality.is-empty .mes-quality-empty{display:block;}'
    document.head.appendChild(style)
  }

  function syncOverlayBounds() {
    var host = document.querySelector('.dataease-dashboard-home')
    var frame = document.querySelector('.dataease-dashboard-frame')
    var overlay = document.getElementById(OVERLAY_ID)
    if (!host || !frame || !overlay) return

    if (getComputedStyle(host).position === 'static') host.style.position = 'relative'

    var hostRect = host.getBoundingClientRect()
    var frameRect = frame.getBoundingClientRect()
    // DataEase scales this 16:9 screen from its width, even when the iframe is
    // a few pixels shorter and clips the bottom. Keep the overlay on that same
    // virtual canvas or percentage-based Y positions drift on wide displays.
    var designHeight = frameRect.width * 9 / 16
    overlay.style.left = Math.round(frameRect.left - hostRect.left) + 'px'
    overlay.style.top = Math.round(frameRect.top - hostRect.top) + 'px'
    overlay.style.width = Math.round(frameRect.width) + 'px'
    overlay.style.height = Math.round(designHeight) + 'px'
  }

  function scheduleBoundsSync() {
    if (boundsTimer) window.clearTimeout(boundsTimer)
    boundsTimer = window.setTimeout(function () {
      boundsTimer = null
      syncOverlayBounds()
    }, 120)
  }

  function bindFrameListeners() {
    var frame = document.querySelector('.dataease-dashboard-frame')
    if (!frame || frame.getAttribute('data-mes-overlay-bound') === 'true') return
    frame.setAttribute('data-mes-overlay-bound', 'true')
    frame.addEventListener('load', scheduleBoundsSync)
    window.addEventListener('resize', scheduleBoundsSync)
    if (window.ResizeObserver) {
      if (overlayResizeObserver) overlayResizeObserver.disconnect()
      overlayResizeObserver = new ResizeObserver(scheduleBoundsSync)
      overlayResizeObserver.observe(frame)
      if (frame.parentElement) overlayResizeObserver.observe(frame.parentElement)
    }
  }

  function renderInventory(overlay, inventory) {
    var body = overlay.querySelector('.mes-material-stock tbody')
    var status = overlay.querySelector('[data-stock-status]')
    if (!body || !status) return
    body.textContent = ''
    inventory.rows.forEach(function (material) {
      var row = document.createElement('tr')
      ;[material.warehouse, material.name].forEach(function (value) {
        var cell = document.createElement('td')
        cell.textContent = value
        row.appendChild(cell)
      })
      var orderCell = document.createElement('td')
      var code = document.createElement('span')
      code.className = 'mes-stock-code'
      code.textContent = inventory.active ? inventory.workorderCodes : '待下单'
      code.title = inventory.active ? inventory.workorderCodes : '下单成功后关联生产工单'
      orderCell.appendChild(code)
      row.appendChild(orderCell)
      var stockCell = document.createElement('td')
      var remaining = document.createElement('span')
      remaining.className = 'mes-stock-remaining'
      remaining.textContent = String(material.remaining)
      stockCell.appendChild(remaining)
      if (material.allocated) {
        var delta = document.createElement('small')
        delta.className = 'mes-stock-delta' + (material.shortage ? ' mes-stock-shortage' : '')
        delta.textContent = material.shortage ? '缺 ' + material.shortage : '−' + material.allocated
        delta.title = '备料库存 ' + material.opening + '，工单领用 ' + material.allocated
        stockCell.appendChild(delta)
      }
      row.appendChild(stockCell)
      body.appendChild(row)
    })
    var shortage = inventory.rows.some(function (material) { return material.shortage > 0 })
    status.className = 'mes-stock-status' + (inventory.active ? ' is-active' : '')
    status.textContent = inventory.active
      ? '已同步 ' + inventory.orderCount + ' 张工单领料 · ' + (shortage ? '部分物料待补库' : '库存已更新')
      : '备料就绪 · 下单后同步工单领料'
  }

  function renderDemoNotices(overlay, notices) {
    var body = overlay.querySelector('.mes-demo-notices tbody')
    if (!body) return
    body.textContent = ''
    notices.rows.forEach(function (notice, index) {
      var row = document.createElement('tr')
      var date = new Date(notice.timestamp)
      var time = pad(date.getHours()) + ':' + pad(date.getMinutes()) + ':' + pad(date.getSeconds())
      ;[String(index + 1).padStart(2, '0'), time, notice.level, notice.content].forEach(function (value, column) {
        var cell = document.createElement('td')
        if (column === 2) {
          var badge = document.createElement('span')
          badge.className = 'mes-notice-level'
          badge.textContent = value
          cell.appendChild(badge)
        } else {
          cell.textContent = value
        }
        if (column === 1) cell.title = dayKey(date) + ' ' + time
        if (column === 3) cell.className = 'mes-notice-content'
        row.appendChild(cell)
      })
      body.appendChild(row)
    })
  }

  function renderDemoUtilization(overlay, utilization) {
    var panel = overlay.querySelector('.mes-demo-utilization')
    if (!panel) return
    panel.className = 'mes-demo-utilization' + (utilization.active ? ' is-running' : '')
    panel.querySelector('[data-utilization-average]').textContent = utilization.average.toFixed(1) + '%'
    panel.querySelector('[data-utilization-status]').textContent = utilization.status
    var orders = panel.querySelector('[data-utilization-orders]')
    orders.textContent = utilization.workorderCodes ? '关联工单：' + utilization.workorderCodes : '等待工单下发'
    orders.title = orders.textContent
    var body = panel.querySelector('.mes-utilization-devices')
    body.textContent = ''
    utilization.devices.forEach(function (device) {
      var row = document.createElement('div')
      row.className = 'mes-utilization-row'
      var name = document.createElement('span')
      name.textContent = device.name
      var track = document.createElement('div')
      track.className = 'mes-utilization-track'
      track.setAttribute('role', 'meter')
      track.setAttribute('aria-label', device.name + '演示稼动率')
      track.setAttribute('aria-valuemin', '0')
      track.setAttribute('aria-valuemax', '100')
      track.setAttribute('aria-valuenow', String(device.rate))
      var fill = document.createElement('span')
      fill.className = 'mes-utilization-fill'
      fill.style.width = device.rate + '%'
      track.appendChild(fill)
      var value = document.createElement('span')
      value.className = 'mes-utilization-rate'
      value.textContent = device.rate + '%'
      row.appendChild(name)
      row.appendChild(track)
      row.appendChild(value)
      body.appendChild(row)
    })
  }

  function updateOverlayValues(overlay, metrics) {
    var daily = overlay.querySelector('[data-kpi="dailyOutput"]')
    var monthly = overlay.querySelector('[data-kpi="monthlyOutput"]')
    var plan = overlay.querySelector('[data-kpi="monthlyPlan"]')
    var running = overlay.querySelector('[data-kpi="runningTime"]')
    var power = overlay.querySelector('[data-energy="power"]')
    var total = overlay.querySelector('[data-energy="total"]')
    var unit = overlay.querySelector('[data-energy="unit"]')
    var status = overlay.querySelector('[data-energy="status"]')
    if (daily) daily.textContent = metrics.dailyOutput
    if (monthly) monthly.textContent = metrics.monthlyOutput
    if (plan) plan.textContent = metrics.monthlyPlan
    if (running) running.textContent = metrics.runningTime
    if (power) power.textContent = metrics.active ? metrics.energyKwh + ' kW' : '-'
    if (total) total.textContent = metrics.active ? (Number(metrics.energyKwh) * 2.4).toFixed(1) + ' kWh' : '-'
    if (unit) unit.textContent = metrics.active ? '1.26 kWh' : '-'
    if (status) status.textContent = metrics.active ? '正常' : '待下单'
    renderInventory(overlay, metrics.inventory)
    renderDemoNotices(overlay, metrics.notices)
    renderDemoUtilization(overlay, metrics.utilization)
    var quality = overlay.querySelector('.mes-demo-quality')
    if (quality) {
      quality.className = 'mes-demo-quality' + (metrics.qualityRate === null ? ' is-empty' : '')
      quality.querySelector('[data-quality-rate]').textContent = metrics.qualityRate === null ? '' : metrics.qualityRate + '%'
      var qualityOrders = quality.querySelector('[data-quality-orders]')
      qualityOrders.textContent = metrics.workorderCodes ? '关联工单：' + metrics.workorderCodes : ''
      qualityOrders.title = qualityOrders.textContent
    }
    overlay.setAttribute('aria-label', metrics.active ? '已下单工单统计：' + metrics.workorderCodes : '等待下单，暂无生产统计')
  }

  function renderOverlay(metrics, force) {
    var host = document.querySelector('.dataease-dashboard-home')
    if (!host) return false

    var key = metricsKey(metrics)
    if (!force && key === lastRenderedKey && document.getElementById(OVERLAY_ID)) {
      syncOverlayBounds()
      return false
    }

    ensureStyles()
    bindFrameListeners()

    var overlay = document.getElementById(OVERLAY_ID)
    if (overlay && !overlay.querySelector('.mes-kpi-strip')) {
      overlay.remove()
      overlay = null
      lastRenderedKey = ''
    }
    if (!overlay) {
      overlay = document.createElement('div')
      overlay.id = OVERLAY_ID
      overlay.innerHTML =
        '<div class="mes-kpi-strip">' +
          '<div class="mes-kpi-value-slot" data-kpi="dailyOutput">0</div>' +
          '<div class="mes-kpi-value-slot" data-kpi="monthlyOutput">0</div>' +
          '<div class="mes-kpi-value-slot" data-kpi="monthlyPlan">0</div>' +
          '<div class="mes-kpi-value-slot" data-kpi="runningTime">0h</div>' +
        '</div>' +
        '<div class="mes-energy-grid">' +
          '<div class="mes-energy-item"><span>\u5b9e\u65f6\u529f\u7387</span><strong data-energy="power">0 kW</strong></div>' +
          '<div class="mes-energy-item"><span>\u5f53\u65e5\u7d2f\u8ba1</span><strong data-energy="total">0 kWh</strong></div>' +
          '<div class="mes-energy-item"><span>\u5355\u4ef6\u80fd\u8017</span><strong data-energy="unit">1.26 kWh</strong></div>' +
          '<div class="mes-energy-item"><span>\u8fd0\u884c\u72b6\u6001</span><strong data-energy="status">\u6b63\u5e38</strong></div>' +
        '</div>'
      host.appendChild(overlay)
    }

    if (!overlay.querySelector('.mes-material-stock')) {
      var stock = document.createElement('section')
      stock.className = 'mes-material-stock'
      stock.setAttribute('aria-label', '物料库存')
      stock.innerHTML = '<table><colgroup><col style="width:22%"><col style="width:26%"><col style="width:32%"><col style="width:20%"></colgroup>' +
        '<thead><tr><th>仓库名称</th><th>产品物料名称</th><th>生产工单编号</th><th>在库数量</th></tr></thead><tbody></tbody></table>' +
        '<p class="mes-stock-status" data-stock-status></p>'
      overlay.appendChild(stock)
    }

    if (!overlay.querySelector('.mes-demo-notices')) {
      var notices = document.createElement('section')
      notices.className = 'mes-demo-notices'
      notices.setAttribute('aria-label', '报警提醒（演示运行记录）')
      notices.innerHTML = '<div class="mes-notice-scroll"><table><colgroup><col style="width:9%"><col style="width:19%"><col style="width:14%"><col style="width:58%"></colgroup>' +
        '<thead><tr><th>No.</th><th>时间</th><th>级别</th><th>内容</th></tr></thead><tbody></tbody></table></div>' +
        '<p class="mes-notice-summary"><span>演示数据 · 下单后同步运行记录</span><strong>● 正常运行 / 无报警</strong></p>'
      overlay.appendChild(notices)
    }

    if (!overlay.querySelector('.mes-demo-utilization')) {
      var utilization = document.createElement('section')
      utilization.className = 'mes-demo-utilization'
      utilization.setAttribute('aria-label', '设备稼动率（演示数据）')
      utilization.innerHTML = '<div class="mes-utilization-summary"><span>综合稼动率<strong data-utilization-average></strong></span><span data-utilization-status></span></div>' +
        '<div class="mes-utilization-devices"></div>' +
        '<div class="mes-utilization-footer"><span data-utilization-orders></span><span>演示数据 · 随工单负载模拟</span></div>'
      overlay.appendChild(utilization)
    }

    if (!overlay.querySelector('.mes-demo-quality')) {
      var quality = document.createElement('section')
      quality.className = 'mes-demo-quality is-empty'
      quality.setAttribute('aria-label', '生产质量（演示数据）')
      quality.innerHTML = '<div class="mes-quality-visual"><span class="mes-quality-empty">暂无数据</span>' +
        '<div class="mes-quality-ring"><strong data-quality-rate></strong><span>合格率</span></div></div>' +
        '<div class="mes-quality-caption"><span data-quality-orders></span><span>演示数据 · 产品质量合格</span></div>'
      overlay.appendChild(quality)
    }

    updateOverlayValues(overlay, metrics)
    syncOverlayBounds()
    lastRenderedKey = key
    return true
  }

  function reloadDashboardFrame() {
    var frame = document.querySelector('.dataease-dashboard-frame')
    if (!frame || !frame.src) return
    var url = new URL(frame.src, window.location.origin)
    url.searchParams.set('reload', String(Date.now()))
    frame.src = url.toString()
  }

  function refreshDashboard(force) {
    renderOverlay(buildMetrics(readState()), force)
  }

  function handleOrderSuccess(event) {
    if (window.__MES_DEMO_RESETTING__) return Promise.resolve()
    var detail = event && event.detail
    recordOrderSuccess(detail)
    refreshDashboard(true)
    return syncDispatchedOrders().finally(function () {
      if (window.__MES_DEMO_RESETTING__) return
      refreshDashboard(true)
      reloadDashboardFrame()
      window.dispatchEvent(new CustomEvent('mes-dashboard-metrics-updated', {
        detail: buildMetrics(readState())
      }))
    })
  }

  function scheduleMountCheck() {
    if (mountTimer) return
    mountTimer = window.setTimeout(function () {
      mountTimer = null
      if (document.querySelector('.dataease-dashboard-home')) {
        refreshDashboard(false)
        syncDispatchedOrders().then(function (changed) {
          refreshDashboard(false)
          if (changed) reloadDashboardFrame()
        })
      }
    }, 800)
  }

  function hookHistoryNavigation() {
    var originalPushState = history.pushState
    var originalReplaceState = history.replaceState
    history.pushState = function () {
      var result = originalPushState.apply(this, arguments)
      scheduleMountCheck()
      return result
    }
    history.replaceState = function () {
      var result = originalReplaceState.apply(this, arguments)
      scheduleMountCheck()
      return result
    }
    window.addEventListener('popstate', scheduleMountCheck)
  }

  window.addEventListener('flex-schedule-order-success', handleOrderSuccess)
  hookHistoryNavigation()

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scheduleMountCheck)
  } else {
    scheduleMountCheck()
  }

  window.setInterval(function () {
    if (!document.querySelector('.dataease-dashboard-home')) return
    refreshDashboard(false)
    syncDispatchedOrders().then(function (changed) {
      refreshDashboard(false)
      if (changed) reloadDashboardFrame()
    })
  }, 5000)
})()
