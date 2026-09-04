(function () {
  'use strict'

  var PRODUCTION_MODULE_EVENT = 'mes-production-module-activated'
  var PRODUCTION_MODULE_SESSION_KEY = 'mes-production-module-active-v1'
  var PRODUCTION_MENU_LABELS = ['生产工单', '工序设置', '工艺流程', '生产排产', '生产报工']
  var PRODUCTION_PAGE_GATE_ID = 'mes-production-page-inactive'

  function readProductionModuleState() {
    try { return window.sessionStorage.getItem(PRODUCTION_MODULE_SESSION_KEY) === 'active' }
    catch (_error) { return false }
  }

  function persistProductionModuleState() {
    try { window.sessionStorage.setItem(PRODUCTION_MODULE_SESSION_KEY, 'active') }
    catch (_error) { /* Keep the in-memory state when browser storage is unavailable. */ }
  }

  window.__MES_PRODUCTION_MODULE_ACTIVE__ = readProductionModuleState()

  function applyProductionModuleGate() {
    var active = window.__MES_PRODUCTION_MODULE_ACTIVE__ === true
    Array.prototype.slice.call(document.querySelectorAll('.sidebar-container .el-menu-item')).forEach(function (item) {
      if (PRODUCTION_MENU_LABELS.indexOf((item.textContent || '').trim()) < 0) return
      if (active) {
        if (item.getAttribute('data-production-module-gated') === 'true') {
          item.style.removeProperty('display')
          item.removeAttribute('aria-hidden')
          item.removeAttribute('data-production-module-gated')
        }
        return
      }
      item.style.setProperty('display', 'none', 'important')
      item.setAttribute('aria-hidden', 'true')
      item.setAttribute('data-production-module-gated', 'true')
    })
  }

  function isProductionPage() {
    return /^\/mes\/pro(?:\/|$)/.test(location.pathname)
  }

  function applyProductionPageGate() {
    var active = window.__MES_PRODUCTION_MODULE_ACTIVE__ === true
    var gate = document.getElementById(PRODUCTION_PAGE_GATE_ID)
    if (active || !isProductionPage()) {
      if (gate) gate.remove()
      return
    }
    if (!gate) {
      gate = document.createElement('section')
      gate.id = PRODUCTION_PAGE_GATE_ID
      gate.setAttribute('aria-label', '生产管理模块未加载')
      gate.innerHTML = '<div><i></i><strong>暂无生产数据</strong><span>生产管理模块尚未加载</span></div>'
      gate.style.cssText = 'position:fixed;top:0;right:0;bottom:0;z-index:1900;display:flex;align-items:center;justify-content:center;background:#061426;color:#79a7d6;font-family:"Microsoft YaHei",sans-serif;'
      var inner = gate.firstElementChild
      inner.style.cssText = 'text-align:center;transform:translateY(-10px);'
      inner.querySelector('i').style.cssText = 'display:block;width:40px;height:40px;margin:0 auto 15px;border:1px solid #236091;border-radius:50%;box-shadow:inset 0 0 18px rgba(31,127,203,.12);'
      inner.querySelector('strong').style.cssText = 'display:block;color:#a9cbea;font-size:18px;font-weight:500;letter-spacing:1px;'
      inner.querySelector('span').style.cssText = 'display:block;margin-top:8px;color:#668fb7;font-size:12px;letter-spacing:1px;'
      document.body.appendChild(gate)
    }
    var sidebar = document.querySelector('.sidebar-container')
    gate.style.left = Math.max(0, Math.round(sidebar ? sidebar.getBoundingClientRect().right : 0)) + 'px'
  }

  window.addEventListener(PRODUCTION_MODULE_EVENT, function () {
    window.__MES_PRODUCTION_MODULE_ACTIVE__ = true
    persistProductionModuleState()
    applyProductionModuleGate()
    applyProductionPageGate()
  })
  window.addEventListener('resize', applyProductionPageGate)

  function loadPlatformUpdater() {
    if (!document.querySelector('link[data-platform-updater]')) {
      var style = document.createElement('link')
      style.rel = 'stylesheet'
      style.href = '/static/css/platform-updater.css?v=20260904-save-update-button'
      style.setAttribute('data-platform-updater', 'true')
      document.head.appendChild(style)
    }
    if (!document.querySelector('script[data-platform-updater]')) {
      var script = document.createElement('script')
      script.src = '/static/js/platform-updater.js?v=20260904-auto-review-flow'
      script.async = false
      script.setAttribute('data-platform-updater', 'true')
      script.addEventListener('load', function () { script.setAttribute('data-loaded', 'true') })
      script.addEventListener('error', function () { script.setAttribute('data-load-error', 'true') })
      document.head.appendChild(script)
    }
  }

  function loadScheduleFeedbackLink() {
    if (document.querySelector('script[data-schedule-feedback-link]')) return
    var script = document.createElement('script')
    script.src = '/static/js/schedule-feedback-link.js?v=20260903-auto-feedback-view'
    script.async = false
    script.setAttribute('data-schedule-feedback-link', 'true')
    document.head.appendChild(script)
  }

  function loadDashboardOrderSync() {
    if (document.querySelector('script[data-dashboard-order-sync]')) return
    var script = document.createElement('script')
    script.src = '/static/js/dashboard-order-sync.js?v=20260903-production-page-gate'
    script.async = false
    script.setAttribute('data-dashboard-order-sync', 'true')
    document.head.appendChild(script)
  }

  loadPlatformUpdater()
  loadScheduleFeedbackLink()
  loadDashboardOrderSync()

  function removeIotConsoleEntry() {
    Array.prototype.slice.call(document.querySelectorAll('button')).forEach(function (button) {
      if ((button.textContent || '').replace(/\s+/g, '') !== 'IOT控制台') return
      var entry = button.closest('.right-menu-item') || button.parentElement || button
      entry.style.setProperty('display', 'none', 'important')
      entry.setAttribute('aria-hidden', 'true')
      entry.setAttribute('data-iot-console-removed', 'true')
    })
  }

  var iotConsoleObserver = new MutationObserver(removeIotConsoleEntry)
  iotConsoleObserver.observe(document.documentElement, { childList: true, subtree: true })
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', removeIotConsoleEntry)
  else removeIotConsoleEntry()

  var PANEL_ID = 'flexible-scheduling-workbench'
  var routeRealtimeSyncStarted = false
  var EXTRA_PRODUCTS = [
    { src: '/static/img/pj5.png', name: '品类五' },
    { src: '/static/img/pj6.png', name: '品类六' },
    { src: '/static/img/pj7-v2.png', name: '品类七' },
    { src: '/static/img/pj8-v2.png', name: '品类八' }
  ]

  function findViewModel(container) {
    var node = container
    while (node) {
      var viewModel = node.__vue__
      while (viewModel) {
        if (Array.isArray(viewModel.productList)) return viewModel
        viewModel = viewModel.$parent
      }
      node = node.parentElement
    }
    return null
  }

  function setSingleSelectedProduct(container, selectedCard, selectedIndex) {
    container.querySelectorAll('.product-image--selectable').forEach(function (item) {
      item.classList.toggle('is-selected', item === selectedCard)
    })
    var viewModel = findViewModel(container)
    if (viewModel && viewModel.selectedProductIndex !== selectedIndex) {
      viewModel.selectedProductIndex = selectedIndex
    }
    var selectedName = selectedCard.querySelector('.image-desc')
    var currentName = container.querySelector('.action-group__value')
    if (selectedName && currentName) currentName.textContent = selectedName.textContent.trim()
  }

  function bindSingleProductSelection(container) {
    var imageGroup = container.querySelector('.image-group')
    if (!imageGroup || imageGroup.getAttribute('data-single-selection-bound') === 'true') return
    imageGroup.setAttribute('data-single-selection-bound', 'true')
    imageGroup.addEventListener('click', function (event) {
      var selectedCard = event.target.closest('.product-image--selectable')
      if (!selectedCard || !imageGroup.contains(selectedCard)) return
      var cards = Array.prototype.slice.call(imageGroup.querySelectorAll('.product-image--selectable'))
      var selectedIndex = cards.indexOf(selectedCard)
      if (selectedIndex < 0) return
      setSingleSelectedProduct(container, selectedCard, selectedIndex)
      window.setTimeout(function () {
        setSingleSelectedProduct(container, selectedCard, selectedIndex)
      }, 0)
    })
  }

  function selectDefaultSecondProduct(container) {
    if (container.getAttribute('data-default-product-selected') === 'true') return
    var cards = container.querySelectorAll('.product-image--selectable')
    if (cards.length < 2) return
    container.setAttribute('data-default-product-selected', 'true')
    setSingleSelectedProduct(container, cards[1], 1)
  }

  function ensureAdditionalProducts(container) {
    var viewModel = findViewModel(container)
    if (viewModel) {
      EXTRA_PRODUCTS.forEach(function (product) {
        var exists = viewModel.productList.some(function (item) {
          return item && (item.src === product.src || item.name === product.name)
        })
        if (!exists) viewModel.productList.push({ src: product.src, name: product.name })
      })
      return
    }

    var imageGroup = container.querySelector('.image-group')
    if (!imageGroup) return
    EXTRA_PRODUCTS.forEach(function (product, offset) {
      var index = offset + 4
      if (imageGroup.querySelector('[data-flex-product-index="' + index + '"]')) return
      var card = document.createElement('div')
      card.className = 'product-image product-image--selectable'
      card.setAttribute('data-flex-product-index', index)
      card.innerHTML =
        '<div class="el-image img-preview1"><img src="' + product.src + '" alt="' + product.name + '" class="el-image__inner" style="object-fit:contain"></div>' +
        '<p class="image-desc">' + product.name + '</p>'
      card.addEventListener('click', function () {
        setSingleSelectedProduct(container, card, index)
      })
      imageGroup.appendChild(card)
    })
  }

  function pad(value) {
    return String(value).padStart(2, '0')
  }

  function formatDate(date, withTime) {
    var value = date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate())
    return withTime ? value + ' ' + pad(date.getHours()) + ':' + pad(date.getMinutes()) : value
  }

  function syncRealtimeRouteFields() {
    if (location.pathname.indexOf('/mes/pro/proroute') < 0 || routeRealtimeSyncStarted) return
    var tokenMatch = document.cookie.match(/(?:^|;\s*)Admin-Token=([^;]+)/)
    if (!tokenMatch) return
    routeRealtimeSyncStarted = true
    var token = decodeURIComponent(tokenMatch[1])
    var headers = { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json;charset=UTF-8' }
    var now = new Date()
    var routeCode = 'TRACE-LAGER-' + now.getFullYear() + pad(now.getMonth() + 1) + pad(now.getDate()) + '-001'
    var routeDesc = '二维码关联生产批次与工艺节点，实现产品全过程追溯。'
    var routeRemark = '扫码可查询产品生产、质检及入库信息。'
    fetch('/prod-api/mes/pro/proroute/list?pageNum=1&pageSize=100', { headers: headers })
      .then(function (response) { return response.json() })
      .then(function (body) {
        var rows = body.rows || []
        var route = rows.find(function (item) {
          return /^TRACE-LAGER-\d{8}-001$/.test(item.routeCode || '') || item.routeName === '追溯罐装路线'
        })
        if (!route) return null
        if (route.routeCode === routeCode && route.routeDesc === routeDesc && route.remark === routeRemark) return null
        return fetch('/prod-api/mes/pro/proroute', {
          method: 'PUT',
          headers: headers,
          body: JSON.stringify(Object.assign({}, route, {
            routeCode: routeCode,
            routeName: '追溯罐装路线',
            routeDesc: routeDesc,
            remark: routeRemark,
            enableFlag: 'Y'
          }))
        }).then(function (response) { return response.json() })
      })
      .then(function (result) {
        if (result && (result.code === undefined || result.code === 200)) window.setTimeout(function () { window.location.reload() }, 300)
      })
      .catch(function () { routeRealtimeSyncStarted = false })
  }

  function getButtonLabel(button) {
    return button.querySelector('span') || button
  }

  function getSelectedIndex(container) {
    var cards = Array.prototype.slice.call(container.querySelectorAll('.product-image--selectable'))
    var selected = container.querySelector('.product-image--selectable.is-selected')
    return Math.max(0, cards.indexOf(selected))
  }

  function getSelectedName(container) {
    var selected = container.querySelector('.product-image--selectable.is-selected .image-desc')
    return selected ? selected.textContent.trim() : '当前品类'
  }

  function getWorkorder(container) {
    var root = container.closest('.app-container')
    var vm = root && root.__vue__
    var rows = vm && vm.workorderList
    var row = rows && rows.length ? rows[rows.length - 1] : null
    return row && (row.workorderCode || row.workorderName || ('WO-' + row.workorderId)) || '系统当前可用工单'
  }

  function reorderProductionMenu() {
    var items = Array.prototype.slice.call(document.querySelectorAll('.sidebar-container .el-menu-item'))
    function findItem(label) {
      return items.find(function (item) { return item.textContent.trim() === label })
    }
    var workorderItem = findItem('生产工单')
    var scheduleItem = findItem('生产排产')
    var processItem = findItem('工序设置')
    var routeItem = findItem('工艺流程')
    if (!workorderItem || !scheduleItem || !processItem || !routeItem) return

    var parent = scheduleItem.parentElement
    while (parent && !(parent.contains(workorderItem) && parent.contains(processItem) && parent.contains(routeItem))) {
      parent = parent.parentElement
    }
    if (!parent || !parent.classList.contains('el-menu')) return

    function directChild(node) {
      while (node && node.parentElement !== parent) node = node.parentElement
      return node
    }
    var workorderNode = directChild(workorderItem)
    var scheduleNode = directChild(scheduleItem)
    var processNode = directChild(processItem)
    var routeNode = directChild(routeItem)
    var orderedNodes = [workorderNode, processNode, routeNode, scheduleNode]
    if (orderedNodes.every(Boolean) && !orderedNodes.every(function (node, index) {
      return index === 0 || orderedNodes[index - 1].nextElementSibling === node
    })) {
      var anchor = workorderNode
      ;[processNode, routeNode, scheduleNode].forEach(function (node) {
        parent.insertBefore(node, anchor.nextElementSibling)
        anchor = node
      })
    }
  }

  function enhance(container) {
    if (!container) return
    var deviceCard = container.querySelector('.product-image--device')
    if (deviceCard) deviceCard.remove()
    ensureAdditionalProducts(container)
    bindSingleProductSelection(container)
    selectDefaultSecondProduct(container)
    if (container.querySelector('#' + PANEL_ID)) return
    var actionGroup = container.querySelector('.action-group')
    var orderButton = actionGroup && actionGroup.querySelector('.el-button--primary')
    var quantityInput = actionGroup && actionGroup.querySelector('input[type="number"]')
    if (!actionGroup || !orderButton || !quantityInput) return
    var quantityDescriptor = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')
    if (quantityDescriptor && quantityDescriptor.set) quantityDescriptor.set.call(quantityInput, '10')
    else quantityInput.value = '10'
    quantityInput.dispatchEvent(new Event('input', { bubbles: true }))
    quantityInput.setAttribute('value', '10')
    quantityInput.setAttribute('data-fixed-quantity', '10')
    var quantityFormItem = quantityInput.closest('.el-form-item')
    if (quantityFormItem) {
      quantityFormItem.style.display = 'none'
      quantityFormItem.setAttribute('aria-hidden', 'true')
    }
    orderButton.classList.add('schedule-generate-button')
    orderButton.classList.remove('el-button--primary')
    var confirmButton = actionGroup.querySelector('.schedule-confirm-button')
    if (!confirmButton) {
      confirmButton = document.createElement('button')
      confirmButton.type = 'button'
      confirmButton.className = 'el-button el-button--primary el-button--medium schedule-confirm-button'
      confirmButton.innerHTML = '<i class="el-icon-s-promotion"></i><span>确认方案并下发</span>'
      orderButton.parentElement.appendChild(confirmButton)
    }
    confirmButton.disabled = true

    var workbench = document.createElement('div')
    workbench.id = PANEL_ID
    workbench.className = 'flex-scheduling-workbench'
    workbench.innerHTML =
      '<section class="flex-config-card">' +
        '<header><div><i class="el-icon-setting"></i><strong>排产参数</strong></div><span>调整参数后生成可执行方案</span></header>' +
        '<div class="flex-config-grid">' +
          '<label><span>期望交付时间</span><input class="flex-field" data-field="deadline" type="date"></label>' +
          '<label><span>订单优先级</span><div class="flex-priority" data-field="priority"><button type="button" data-value="normal">常规</button><button type="button" class="active" data-value="urgent">加急</button><button type="button" data-value="critical">插单</button></div></label>' +
          '<label><span>优化策略</span><select class="flex-field" data-field="strategy"><option value="balanced">产能均衡优先</option><option value="delivery">最早交付优先</option><option value="changeover">减少换型优先</option></select></label>' +
          '<label><span>产线分配</span><select class="flex-field" data-field="line"><option value="auto">系统智能匹配</option><option value="line-a">柔性灌装线 A</option><option value="line-b">柔性灌装线 B</option><option value="line-c">柔性灌装线 C</option></select></label>' +
        '</div>' +
      '</section>' +
      '<section class="flex-preview-card">' +
        '<header><div><i class="el-icon-data-analysis"></i><strong>方案预览</strong></div><span class="flex-preview-status">等待参数确认</span></header>' +
        '<div class="flex-preview-empty"><i class="el-icon-s-grid"></i><strong>尚未生成排产方案</strong><span>系统将结合工单、交期与产线负载生成推荐方案</span></div>' +
        '<div class="flex-preview-result" hidden></div>' +
      '</section>'
    container.insertBefore(workbench, actionGroup)

    var deadline = workbench.querySelector('[data-field="deadline"]')
    var defaultDeadline = new Date()
    deadline.value = formatDate(defaultDeadline, false)
    deadline.min = formatDate(new Date(), false)
    deadline.disabled = true

    var state = { generated: false, calculating: false, priority: 'urgent', timer: null, allowSubmitOnce: false }
    var status = workbench.querySelector('.flex-preview-status')
    var empty = workbench.querySelector('.flex-preview-empty')
    var result = workbench.querySelector('.flex-preview-result')

    function resetPlan() {
      if (state.timer) window.clearInterval(state.timer)
      state.timer = null
      state.generated = false
      state.calculating = false
      status.textContent = '等待参数确认'
      status.classList.remove('ready')
      empty.hidden = false
      result.hidden = true
      result.innerHTML = ''
      getButtonLabel(orderButton).textContent = '生成排产方案'
      orderButton.classList.remove('is-plan-ready')
      orderButton.disabled = false
      confirmButton.disabled = true
    }

    function generatePlan() {
      var quantity = Math.max(1, Number(quantityInput.value) || 1)
      var selectedIndex = getSelectedIndex(container)
      var priorityOffset = state.priority === 'critical' ? 10 : state.priority === 'urgent' ? 30 : 60
      var start = new Date(Date.now() + priorityOffset * 60000)
      var durationMinutes = Math.max(45, Math.ceil(quantity / 20) * 15)
      var end = new Date(start.getTime() + durationMinutes * 60000)
      var strategy = workbench.querySelector('[data-field="strategy"]').value
      var lineValue = workbench.querySelector('[data-field="line"]').value
      var autoLines = ['柔性灌装线 A', '柔性灌装线 B', '柔性灌装线 C']
      var lines = { 'line-a': autoLines[0], 'line-b': autoLines[1], 'line-c': autoLines[2] }
      var lineName = lineValue === 'auto' ? autoLines[selectedIndex % 3] : lines[lineValue]
      var reasons = {
        balanced: '已兼顾当前各产线负载，避免局部产能拥堵。',
        delivery: '已优先压缩等待时间，满足当前交付目标。',
        changeover: '已优先匹配同品类生产节拍，降低换型损耗。'
      }
      var load = Math.min(92, 58 + selectedIndex * 7 + Math.ceil(quantity / 100))
      var score = lineValue === 'auto' ? 96 - selectedIndex : 89
      var planCode = 'FSP-' + formatDate(new Date(), false).replace(/-/g, '') + '-' + String(Date.now()).slice(-4)

      result.innerHTML =
        '<div class="flex-result-head"><div><span>方案编号</span><strong>' + planCode + '</strong></div><em>可执行 · 匹配度 ' + score + '% · 产线负载 ' + load + '%</em></div>' +
        '<div class="flex-result-grid">' +
          '<div><span>排产品类</span><strong>' + getSelectedName(container) + ' × ' + quantity + '</strong></div>' +
          '<div><span>匹配工单</span><strong>' + getWorkorder(container) + '</strong></div>' +
          '<div><span>推荐产线</span><strong>' + lineName + '</strong></div>' +
          '<div><span>承诺交期</span><strong>' + deadline.value + '</strong></div>' +
          '<div><span>预计开始</span><strong>' + formatDate(start, true) + '</strong></div>' +
          '<div><span>预计完成</span><strong>' + formatDate(end, true) + '</strong></div>' +
        '</div>' +
        '<div class="flex-load"><span>方案生成进度</span><div><i style="width:0%"></i></div><strong>0%</strong></div>' +
        '<p><i class="el-icon-info"></i>' + reasons[strategy] + '</p>'

      state.generated = false
      state.calculating = true
      status.textContent = '正在计算 0%'
      status.classList.remove('ready')
      empty.hidden = true
      result.hidden = false
      getButtonLabel(orderButton).textContent = '方案计算中 0%'
      orderButton.disabled = true
      confirmButton.disabled = true
      var progressBar = result.querySelector('.flex-load i')
      var progressValue = result.querySelector('.flex-load strong')
      var calculationStartedAt = Date.now()
      state.timer = window.setInterval(function () {
        var progress = Math.min(100, Math.round((Date.now() - calculationStartedAt) / 20))
        progressBar.style.width = progress + '%'
        progressValue.textContent = progress + '%'
        status.textContent = progress < 100 ? '正在计算 ' + progress + '%' : '✓ 方案已生成'
        getButtonLabel(orderButton).textContent = progress < 100 ? '方案计算中 ' + progress + '%' : '重新生成方案'
        if (progress >= 100) {
          window.clearInterval(state.timer)
          state.timer = null
          state.calculating = false
          state.generated = true
          status.classList.add('ready')
          orderButton.disabled = false
          orderButton.classList.add('is-plan-ready')
          confirmButton.disabled = false
        }
      }, 40)
      workbench.querySelector('.flex-preview-card').scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }

    workbench.querySelectorAll('.flex-priority button').forEach(function (button) {
      button.addEventListener('click', function () {
        workbench.querySelectorAll('.flex-priority button').forEach(function (item) { item.classList.remove('active') })
        button.classList.add('active')
        state.priority = button.getAttribute('data-value')
        resetPlan()
      })
    })
    workbench.querySelectorAll('input, select').forEach(function (field) {
      field.addEventListener('change', resetPlan)
    })
    quantityInput.addEventListener('input', resetPlan)
    container.querySelectorAll('.product-image--selectable').forEach(function (card) {
      card.addEventListener('click', function () { setTimeout(resetPlan, 0) })
    })
    orderButton.addEventListener('click', function (event) {
      if (state.allowSubmitOnce) {
        state.allowSubmitOnce = false
        return
      }
      event.preventDefault()
      event.stopImmediatePropagation()
      if (state.calculating) return
      generatePlan()
    }, true)
    confirmButton.addEventListener('click', function (event) {
      event.preventDefault()
      event.stopPropagation()
      if (!state.generated || state.calculating) return
      state.allowSubmitOnce = true
      orderButton.click()
    })
    getButtonLabel(orderButton).textContent = '生成排产方案'
    getButtonLabel(confirmButton).textContent = '确认方案并下发'
  }

  function scan() {
    syncRealtimeRouteFields()
    reorderProductionMenu()
    applyProductionModuleGate()
    applyProductionPageGate()
    document.querySelectorAll('.custom-product-container').forEach(enhance)
  }

  new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true })
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scan)
  else scan()
})()
