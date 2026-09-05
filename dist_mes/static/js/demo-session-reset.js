(function () {
  'use strict'

  var busy = false
  var RESET_SIGNAL = 'mes-demo-reset-completed-v1'
  var SESSION_KEYS = ['mes-dashboard-dispatched-workorders-v2', 'mes-production-module-active-v1']
  var LOCAL_KEYS = ['mes-flex-schedule-feedback-orders-v1', 'mes-dashboard-order-runtime-v1']

  function request(path, options) {
    var match = document.cookie.match(/(?:^|;\s*)Admin-Token=([^;]+)/)
    var config = Object.assign({}, options || {})
    config.headers = { 'Content-Type': 'application/json;charset=UTF-8' }
    if (match) config.headers.Authorization = 'Bearer ' + decodeURIComponent(match[1])
    return fetch(path.indexOf('/ide/') === 0 ? path : '/prod-api' + path, config).then(function (response) {
      return response.json().then(function (body) {
        if (!response.ok || body.code !== 200) throw new Error(body.msg || '请求失败，请检查服务或登录状态')
        return body
      })
    })
  }

  async function listAll(path) {
    var rows = [], seen = Object.create(null)
    for (var page = 1; page <= 1000; page += 1) {
      var result = await request(path + '/list?pageNum=' + page + '&pageSize=100')
      // This project's workorder controller returns an unpaged AjaxResult list.
      if (path === '/mes/pro/workorder' && Array.isArray(result.data)) return result.data
      if (!Array.isArray(result.rows) || !Number.isFinite(Number(result.total))) throw new Error('列表返回异常，已停止重置')
      var signature = JSON.stringify(result.rows)
      if (result.rows.length && seen[signature]) throw new Error('列表分页重复，已停止重置')
      seen[signature] = true
      rows = rows.concat(result.rows)
      if (rows.length >= Number(result.total)) return rows
      if (!result.rows.length) throw new Error('列表数据不完整，请稍后重试')
    }
    throw new Error('演示数据超过可处理范围')
  }

  function selectPlan(workorders, feedback, tasks, products) {
    var imported = workorders.filter(function (row) { return row.attr1 === 'EXCEL_IMPORT' })
    var ids = new Set(imported.map(function (row) { return String(row.workorderId) }))
    var kept = workorders.filter(function (row) { return !ids.has(String(row.workorderId)) })
    return {
      workorders: imported,
      feedback: feedback.filter(function (row) {
        return ids.has(String(row.workorderId)) ||
          (row.feedbackChannel === 'AUTO_SCHEDULE' && String(row.remark || '').indexOf('由柔性排产方案 ') === 0)
      }),
      tasks: tasks.filter(function (row) { return ids.has(String(row.workorderId)) }),
      products: products.filter(function (row) {
        return row.attr1 === 'EXCEL_IMPORT' && !kept.some(function (order) { return String(order.productId) === String(row.itemId) })
      })
    }
  }

  async function preparePlan() {
    var lists = await Promise.all([
      listAll('/mes/pro/workorder'), listAll('/mes/pro/feedback'),
      listAll('/mes/pro/protask'), listAll('/mes/md/mditem'), request('/ide/mes-sandbox/demo-baseline')
    ])
    var plan = selectPlan(lists[0], lists[1], lists[2], lists[3])
    plan.ide = lists[4].data
    if (!plan.ide || !plan.ide.id || !plan.ide.fileCount) throw new Error('IDE 基准不可用，已停止重置')
    return plan
  }

  function planKey(plan) {
    return JSON.stringify(plan.ide) + JSON.stringify(['workorders', 'feedback', 'tasks', 'products'].map(function (key) {
      return plan[key].map(function (row) { return JSON.stringify(row) }).sort()
    }))
  }

  async function deleteRows(path, rows, idField) {
    for (var i = 0; i < rows.length; i += 1) {
      var id = String(rows[i][idField])
      if (!/^[1-9]\d*$/.test(id)) throw new Error('记录编号异常，已停止重置')
      await request(path + '/' + encodeURIComponent(id), { method: 'DELETE' })
    }
  }

  async function executePlan(plan, progress) {
    // Revalidate everything before the first mutation; an open preview is not a lock.
    var fresh = await preparePlan()
    if (planKey(plan) !== planKey(fresh)) throw new Error('数据已变化，请关闭后重新打开重置预览')
    progress('正在清理演示报工和任务…')
    await deleteRows('/mes/pro/feedback', fresh.feedback, 'recordId')
    await deleteRows('/mes/pro/protask', fresh.tasks, 'taskId')
    progress('正在清理导入的演示工单…')
    for (var i = 0; i < fresh.workorders.length; i += 1) {
      var snapshot = fresh.workorders[i]
      var current = (await request('/mes/pro/workorder/' + encodeURIComponent(snapshot.workorderId))).data
      if (!current || current.attr1 !== 'EXCEL_IMPORT' || current.createTime !== snapshot.createTime) {
        throw new Error('工单已变化，已停止后续清理')
      }
      // The standard delete endpoint requires a draft. Preserve all other fields.
      if (current.status !== 'PREPARE') {
        await request('/mes/pro/workorder', { method: 'PUT', body: JSON.stringify(Object.assign({}, current, { status: 'PREPARE' })) })
      }
      await deleteRows('/mes/pro/workorder', [current], 'workorderId')
    }
    progress('正在清理演示导入产品…')
    // Recheck references, in case another workorder was created while resetting.
    var remaining = await listAll('/mes/pro/workorder')
    for (var j = 0; j < fresh.products.length; j += 1) {
      var product = (await request('/mes/md/mditem/' + encodeURIComponent(fresh.products[j].itemId))).data
      if (!product || product.attr1 !== 'EXCEL_IMPORT') throw new Error('产品已变化，已停止后续清理')
      if (!remaining.some(function (order) { return String(order.productId) === String(product.itemId) })) {
        await deleteRows('/mes/md/mditem', [product], 'itemId')
      }
    }
    var check = await preparePlan()
    if (check.workorders.length || check.feedback.length || check.tasks.length || check.products.length) {
      throw new Error('仍有演示数据待清理，请关闭后重新预览并重试')
    }
    progress('正在还原在线 IDE 代码，清除本轮编辑…')
    await request('/ide/mes-sandbox/demo-reset', { method: 'POST' })
  }

  function clearDemoStorage() {
    SESSION_KEYS.forEach(function (key) { sessionStorage.removeItem(key) })
    LOCAL_KEYS.forEach(function (key) { localStorage.removeItem(key) })
    Object.keys(localStorage).filter(function (key) { return key.indexOf('theia:/ide') === 0 }).forEach(function (key) { localStorage.removeItem(key) })
    localStorage.removeItem('mes-online-ide-plugin')
  }

  function finishReset() {
    clearDemoStorage()
    localStorage.setItem(RESET_SIGNAL, String(Date.now()))
    window.location.replace('/index')
  }

  function showReset() {
    if (busy || document.getElementById('mes-demo-reset-dialog')) return
    var layer = document.createElement('div')
    layer.id = 'mes-demo-reset-dialog'
    layer.innerHTML = '<section role="dialog" aria-modal="true" aria-labelledby="mes-demo-reset-title">' +
      '<h2 id="mes-demo-reset-title">重置本轮演示</h2>' +
      '<p>清理演示导入的工单、关联任务和报工，恢复大屏及模块加载状态，随后返回首页。</p>' +
      '<p>在线 IDE 恢复至固定代码基准，本轮新增、修改、删除及未保存的编辑均不留存。保留基础配置、工艺流程、正式业务数据和登录状态。</p>' +
      '<div class="mes-reset-preview">正在检查本轮演示数据…</div>' +
      '<p class="mes-reset-result" role="status"></p>' +
      '<footer><button data-reset-close>取消</button><button data-reset-confirm disabled>重置本轮演示</button></footer></section>'
    document.body.appendChild(layer)
    var close = layer.querySelector('[data-reset-close]')
    var confirm = layer.querySelector('[data-reset-confirm]')
    var result = layer.querySelector('.mes-reset-result')
    var plan = null
    close.onclick = function () { if (!busy) layer.remove() }
    close.focus()
    preparePlan().then(function (data) {
      plan = data
      var preview = layer.querySelector('.mes-reset-preview')
      preview.textContent = '将清理：' + data.workorders.length + ' 张演示工单、' + data.tasks.length + ' 条任务、' +
        data.feedback.length + ' 条报工、' + data.products.length + ' 个演示导入产品。\n' +
        '同时重置：大屏统计、库存演示、质量、稼动率、提示记录、浏览器待报工及生产模块加载状态。\n' +
        '在线 IDE：还原 ' + data.ide.fileCount + ' 个基准文件，撤销本轮全部代码改动。'
      if (data.workorders.length) preview.textContent += '\n工单：' + data.workorders.map(function (row) { return row.workorderCode }).join('、')
      confirm.disabled = false
    }).catch(function (error) { result.textContent = '无法准备重置：' + error.message })
    confirm.onclick = async function () {
      if (busy || !plan) return
      busy = true
      window.__MES_DEMO_RESETTING__ = true
      close.disabled = true
      confirm.disabled = true
      try {
        localStorage.setItem('mes-ide-reset-start-v1', String(Date.now()))
        result.textContent = '正在等待当前同步请求结束…'
        if (window.__MES_WAIT_FOR_FEEDBACK_SYNC__) await window.__MES_WAIT_FOR_FEEDBACK_SYNC__()
        await executePlan(plan, function (message) { result.textContent = message })
        result.textContent = '重置完成，正在返回首页…'
        finishReset()
      } catch (error) {
        // Do not claim success or clear the session after a partial backend failure.
        result.textContent = '重置未完成：' + error.message + '。已完成的清理不会回滚；关闭后可重新预览并重试。'
        busy = false
        close.disabled = false
        close.textContent = '关闭'
        // Keep background demo writers paused until reload to avoid refilling data.
        close.onclick = function () { window.location.reload() }
      }
    }
  }

  function mount() {
    var entry = document.getElementById('mes-demo-reset-entry')
    var existingButton = document.getElementById('mes-demo-reset-button')
    if (!/^\/monitor\/job\/?$/.test(location.pathname)) {
      if (entry) entry.remove()
      else if (existingButton) existingButton.remove()
      return
    }
    var logButton = Array.prototype.find.call(document.querySelectorAll('.app-container .mb8 button'), function (button) {
      return button.textContent.trim() === '日志'
    })
    var logColumn = logButton && logButton.closest('.el-col')
    if (!logColumn) return
    if (entry && entry.previousElementSibling === logColumn) return
    if (entry) entry.remove()
    else if (existingButton) existingButton.remove()
    if (!document.getElementById('mes-demo-reset-style')) {
    var style = document.createElement('style')
    style.id = 'mes-demo-reset-style'
    style.textContent =
      '#mes-demo-reset-dialog{position:fixed;inset:0;z-index:4000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.6);font:14px "Microsoft YaHei",sans-serif;}' +
      '#mes-demo-reset-dialog section{width:560px;max-width:90vw;max-height:85vh;overflow:auto;box-sizing:border-box;padding:24px;background:#fff;border-radius:8px;color:#303133;box-shadow:0 12px 45px #0005;}' +
      '#mes-demo-reset-dialog h2{font-size:19px;margin:0 0 18px;}#mes-demo-reset-dialog p{line-height:1.8;}' +
      '#mes-demo-reset-dialog .mes-reset-preview{padding:14px;background:#f0f7fc;border-radius:4px;line-height:1.9;white-space:pre-wrap;overflow-wrap:anywhere;}' +
      '#mes-demo-reset-dialog .mes-reset-result{color:#536f86;font-size:13px;}' +
      '#mes-demo-reset-dialog footer{display:flex;justify-content:flex-end;gap:12px;margin-top:20px;}' +
      '#mes-demo-reset-dialog button{padding:9px 17px;border:1px solid #dcdfe6;border-radius:4px;background:#fff;cursor:pointer;}' +
      '#mes-demo-reset-dialog [data-reset-confirm]{background:#168ad5;color:#fff;border-color:#168ad5;}#mes-demo-reset-dialog button:disabled{opacity:.5;cursor:default;}'
    document.head.appendChild(style)
    }
    entry = document.createElement('div')
    entry.id = 'mes-demo-reset-entry'
    entry.className = 'el-col el-col-1.5'
    entry.style.cssText = 'padding-left:5px;padding-right:5px;'
    var button = document.createElement('button')
    button.id = 'mes-demo-reset-button'
    button.type = 'button'
    button.className = 'el-button el-button--info el-button--mini is-plain'
    button.innerHTML = '<i class="el-icon-refresh"></i><span>重置演示</span>'
    button.onclick = showReset
    entry.appendChild(button)
    logColumn.insertAdjacentElement('afterend', entry)
  }

  window.addEventListener('storage', function (event) {
    if (event.key === RESET_SIGNAL && event.newValue) {
      window.__MES_DEMO_RESETTING__ = true
      clearDemoStorage()
      window.location.replace('/index')
    }
  })
  new MutationObserver(mount).observe(document.documentElement, { childList: true, subtree: true })
  window.addEventListener('popstate', mount)
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount)
  else mount()
})()
