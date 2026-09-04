(function () {
  'use strict'

  var STORAGE_KEY = 'mes-flex-schedule-feedback-orders-v1'
  var processedMessages = new WeakSet()
  var pendingSchedule = null
  var ignoreNextSuccessToast = false

  function pad(value) { return String(value).padStart(2, '0') }

  function formatDateTime(value) {
    var date = value instanceof Date ? value : new Date(value || Date.now())
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) + ' ' +
      pad(date.getHours()) + ':' + pad(date.getMinutes()) + ':' + pad(date.getSeconds())
  }

  function readOrders() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]').map(function (item) {
        if (item.feedbackChannel === 'AUTO_SCHEDULE') {
          item.status = 'IN_PROGRESS'
          item.userName = ''
          item.nickName = ''
          item.recordUser = ''
          item.recordNick = ''
        }
        return item
      })
    } catch (error) { return [] }
  }

  function writeOrders(rows) { localStorage.setItem(STORAGE_KEY, JSON.stringify(rows.slice(0, 100))) }

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
        if (!response.ok || (body.code !== undefined && body.code !== 200)) throw new Error(body.msg || '请求失败')
        return body
      })
    })
  }

  function findScheduleViewModel() {
    var node = document.querySelector('.custom-product-container')
    while (node) {
      var vm = node.__vue__
      while (vm) {
        if (Array.isArray(vm.productList) && Array.isArray(vm.workorderList)) return vm
        vm = vm.$parent
      }
      node = node.parentElement
    }
    return null
  }

  function collectScheduleFromPage() {
    var vm = findScheduleViewModel()
    var selectedCard = document.querySelector('.custom-product-container .product-image--selectable.is-selected')
    var selectedName = selectedCard && selectedCard.querySelector('.image-desc')
    var quantityInput = document.querySelector('.custom-product-container .action-group input[type="number"]')
    var workorders = vm && vm.workorderList
    var workorder = workorders && workorders.length ? workorders[workorders.length - 1] : {}
    var preview = vm && vm.schedulePreview || {}
    var runtimePreview = document.querySelector('.flex-preview-result')

    function runtimeValue(label) {
      if (!runtimePreview) return ''
      var cells = runtimePreview.querySelectorAll('.flex-result-grid > div')
      for (var i = 0; i < cells.length; i += 1) {
        var span = cells[i].querySelector('span')
        var strong = cells[i].querySelector('strong')
        if (span && strong && span.textContent.trim() === label) return strong.textContent.trim()
      }
      return ''
    }

    return {
      product: { name: selectedName ? selectedName.textContent.trim() : (workorder.productName || '当前品类') },
      quantity: Math.max(1, Number(quantityInput && quantityInput.value) || 1),
      workorder: workorder || {},
      schedule: {
        planCode: preview.planCode || (runtimePreview && runtimePreview.querySelector('.flex-result-head strong') || {}).textContent || '',
        workorderCode: preview.workorderCode || runtimeValue('匹配工单') || workorder.workorderCode || '',
        line: preview.line || runtimeValue('推荐产线') || '柔性灌装线 A',
        startTime: preview.startTime || runtimeValue('预计开始') || formatDateTime(),
        endTime: preview.endTime || runtimeValue('预计完成') || formatDateTime()
      }
    }
  }

  function normalizeOrder(detail) {
    detail = detail || collectScheduleFromPage()
    var workorder = detail.workorder || {}
    var product = detail.product || {}
    var schedule = detail.schedule || {}
    var now = new Date()
    var planCode = String(schedule.planCode || ('FSP-' + now.getTime())).trim()
    return {
      linkId: planCode,
      createdAt: formatDateTime(now),
      feedbackType: 'UNI',
      workstationName: schedule.line || '柔性灌装线 A',
      workstationCode: schedule.line || 'AUTO-LINE',
      workorderId: workorder.workorderId || null,
      workorderCode: workorder.workorderCode || schedule.workorderCode || planCode,
      workorderName: workorder.workorderName || (product.name + '生产排产单'),
      taskId: null,
      taskCode: planCode,
      itemId: workorder.productId || workorder.itemId || null,
      itemCode: workorder.productCode || workorder.itemCode || ('FLEX-' + pad((detail.productIndex || 0) + 1)),
      itemName: workorder.productName || workorder.itemName || product.name || '排产品类',
      specification: workorder.productSpc || workorder.specification || '',
      unitOfMeasure: workorder.unitOfMeasure || 'PCS',
      quantity: Math.max(1, Number(detail.quantity) || 1),
      quantityFeedback: 0,
      quantityQualified: 0,
      quantityUnquanlified: 0,
      userName: '',
      nickName: '',
      feedbackChannel: 'AUTO_SCHEDULE',
      feedbackTime: formatDateTime(now),
      status: 'IN_PROGRESS',
      remark: '由柔性排产方案 ' + planCode + ' 自动生成，等待生产报工。',
      backendSynced: false
    }
  }

  function saveOrder(order) {
    var rows = readOrders().filter(function (item) { return item.linkId !== order.linkId })
    rows.unshift(order)
    writeOrders(rows)
  }

  function syncOrderToBackend(order) {
    if (!order.workorderId) return Promise.reject(new Error('未匹配到生产工单'))
    return request('/mes/pro/protask/list?pageNum=1&pageSize=100&workorderId=' + encodeURIComponent(order.workorderId))
      .then(function (body) {
        var task = (body.rows || [])[0]
        if (!task) throw new Error('生产任务尚未生成')
        var payload = Object.assign({}, order, {
          taskId: task.taskId,
          taskCode: task.taskCode,
          workstationId: task.workstationId,
          workstationCode: task.workstationCode,
          workstationName: task.workstationName || order.workstationName,
          processId: task.processId,
          processCode: task.processCode,
          processName: task.processName,
          itemId: task.itemId || order.itemId,
          itemCode: task.itemCode || order.itemCode,
          itemName: task.itemName || order.itemName,
          specification: task.specification || order.specification,
          unitOfMeasure: task.unitOfMeasure || order.unitOfMeasure
        })
        delete payload.linkId
        delete payload.createdAt
        delete payload.backendSynced
        return request('/mes/pro/feedback', { method: 'POST', body: JSON.stringify(payload) })
      })
      .then(function () {
        order.backendSynced = true
        saveOrder(order)
      })
  }

  function createFeedbackOrder(detail) {
    var order = normalizeOrder(detail)
    saveOrder(order)
    var attempts = 0
    function trySync() {
      attempts += 1
      syncOrderToBackend(order).catch(function () {
        if (attempts < 5) window.setTimeout(trySync, attempts * 800)
      })
    }
    window.setTimeout(trySync, 300)
    window.dispatchEvent(new CustomEvent('schedule-feedback-created', { detail: order }))
  }

  function findFeedbackViewModel() {
    var nodes = document.querySelectorAll('.app-container, .el-table')
    for (var i = 0; i < nodes.length; i += 1) {
      var vm = nodes[i].__vue__
      while (vm) {
        if (Array.isArray(vm.feedbackList)) return vm
        vm = vm.$parent
      }
    }
    return null
  }

  function injectPendingFeedbackRows() {
    if (location.pathname.indexOf('/mes/pro/feedback') < 0) return
    var vm = findFeedbackViewModel()
    if (!vm) return
    readOrders().filter(function (item) { return !item.backendSynced }).forEach(function (order, index) {
      var exists = vm.feedbackList.some(function (row) {
        return row.remark === order.remark || row.taskCode === order.taskCode
      })
      if (!exists) {
        vm.feedbackList.unshift(Object.assign({ recordId: 'AUTO-' + order.linkId + '-' + index }, order))
        vm.total = Number(vm.total || 0) + 1
      }
    })
  }

  function removePendingOrder(order, vm) {
    var rows = readOrders().filter(function (item) { return item.linkId !== order.linkId })
    writeOrders(rows)
    var index = vm.feedbackList.indexOf(order)
    if (index < 0) {
      index = vm.feedbackList.findIndex(function (item) {
        return item.recordId === order.recordId || item.linkId === order.linkId
      })
    }
    if (index >= 0) vm.feedbackList.splice(index, 1)
    vm.total = Math.max(0, Number(vm.total || 0) - 1)
    if (vm.$modal && vm.$modal.msgSuccess) vm.$modal.msgSuccess('删除成功')
  }

  function isPendingAutoOrder(row) {
    return row && typeof row.recordId === 'string' && row.recordId.indexOf('AUTO-') === 0
  }

  function openPendingOrderView(row, vm) {
    if (typeof vm.reset === 'function') vm.reset()
    Object.assign(vm.form, row)
    vm.open = true
    vm.title = '查看生产报工单信息'
    vm.optType = 'view'
  }

  function bindPendingOrderActions() {
    if (document.documentElement.getAttribute('data-pending-feedback-actions-bound') === 'true') return
    document.documentElement.setAttribute('data-pending-feedback-actions-bound', 'true')
    document.addEventListener('click', function (event) {
      if (location.pathname.indexOf('/mes/pro/feedback') < 0) return
      var button = event.target.closest && event.target.closest('.el-table__body-wrapper .el-button')
      if (!button) return
      var action = button.textContent.trim()
      if (action !== '删除' && action !== '查看') return
      var rowElement = button.closest('tbody tr')
      var vm = findFeedbackViewModel()
      if (!rowElement || !vm) return
      var rowElements = Array.prototype.slice.call(rowElement.parentElement.children)
      var row = vm.feedbackList[rowElements.indexOf(rowElement)]
      if (!isPendingAutoOrder(row)) return

      event.preventDefault()
      event.stopImmediatePropagation()
      if (action === '查看') {
        openPendingOrderView(row, vm)
        return
      }

      var confirmation = vm.$modal && vm.$modal.confirm
        ? vm.$modal.confirm('是否确认删除这条自动生成的待报工订单？')
        : Promise.resolve()
      confirmation.then(function () {
        removePendingOrder(row, vm)
      }).catch(function () {})
    }, true)
  }

  function hideTableColumn(table, header) {
    var columnClass = Array.prototype.find.call(header.classList, function (className) {
      return /^el-table_\d+_column_\d+$/.test(className)
    })
    if (!columnClass) return
    var styleId = 'hide-feedback-' + columnClass
    if (document.getElementById(styleId)) return
    var style = document.createElement('style')
    style.id = styleId
    style.textContent =
      '.' + columnClass + '{display:none!important;width:0!important;}' +
      'col[name="' + columnClass + '"]{display:none!important;width:0!important;}'
    document.head.appendChild(style)
    table.setAttribute('data-feedback-columns-customized', 'true')
  }

  function customizeFeedbackPage() {
    if (location.pathname.indexOf('/mes/pro/feedback') < 0) return
    document.querySelectorAll('.app-container .el-form-item__label').forEach(function (label) {
      var text = label.textContent.trim()
      if (text === '工作站名称') label.textContent = '产线名称'
      if (text === '报工人') {
        var formItem = label.closest('.el-form-item')
        if (formItem) formItem.style.display = 'none'
      }
    })

    var vm = findFeedbackViewModel()
    if (vm) {
      vm.feedbackList.forEach(function (row) {
        if (row.feedbackChannel === 'AUTO_SCHEDULE') row.status = 'IN_PROGRESS'
      })
    }

    document.querySelectorAll('.app-container .el-table').forEach(function (table) {
      var headers = Array.prototype.slice.call(table.querySelectorAll('.el-table__header-wrapper th'))
      headers.forEach(function (header) {
        var text = header.textContent.trim()
        if (text === '工作站') {
          var cell = header.querySelector('.cell')
          if (cell) cell.textContent = '产线'
        }
        if (text === '报工人' || text === '审核人') hideTableColumn(table, header)
      })

      var statusIndex = headers.findIndex(function (header) { return header.textContent.trim() === '状态' })
      if (statusIndex < 0 || !vm) return
      var rows = table.querySelectorAll('.el-table__body-wrapper tbody tr')
      Array.prototype.forEach.call(rows, function (rowElement, index) {
        var row = vm.feedbackList[index]
        if (!row || row.feedbackChannel !== 'AUTO_SCHEDULE') return
        var statusCell = rowElement.children[statusIndex]
        if (statusCell && statusCell.getAttribute('data-auto-production-status') !== 'true') {
          statusCell.setAttribute('data-auto-production-status', 'true')
          statusCell.innerHTML = '<div class="cell"><span class="el-tag el-tag--success el-tag--small el-tag--light">生产中</span></div>'
        }
      })
    })
  }

  function detectScheduleSuccess() {
    var messages = document.querySelectorAll('.el-message, .el-notification')
    for (var i = 0; i < messages.length; i += 1) {
      var text = messages[i].textContent || ''
      if (text.indexOf('柔性排产方案已下发') >= 0 && !processedMessages.has(messages[i])) {
        processedMessages.add(messages[i])
        if (ignoreNextSuccessToast) {
          ignoreNextSuccessToast = false
          return
        }
        createFeedbackOrder(pendingSchedule || collectScheduleFromPage())
        pendingSchedule = null
        return
      }
    }
  }

  document.addEventListener('click', function (event) {
    var button = event.target.closest && event.target.closest('.custom-product-container .action-group .el-button--primary')
    if (button && button.textContent.trim().indexOf('确认方案并下发') >= 0) pendingSchedule = collectScheduleFromPage()
  }, true)

  window.addEventListener('flex-schedule-order-success', function (event) {
    ignoreNextSuccessToast = true
    createFeedbackOrder(event.detail)
    pendingSchedule = null
  })

  function scan() {
    detectScheduleSuccess()
    injectPendingFeedbackRows()
    bindPendingOrderActions()
    customizeFeedbackPage()
  }

  new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true })
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scan)
  else scan()
})()
