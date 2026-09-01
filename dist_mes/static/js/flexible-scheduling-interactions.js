(function () {
  'use strict'

  var PANEL_ID = 'flexible-scheduling-workbench'

  function pad(value) {
    return String(value).padStart(2, '0')
  }

  function formatDate(date, withTime) {
    var value = date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate())
    return withTime ? value + ' ' + pad(date.getHours()) + ':' + pad(date.getMinutes()) : value
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

  function enhance(container) {
    if (!container || container.querySelector('#' + PANEL_ID)) return
    var actionGroup = container.querySelector('.action-group')
    var orderButton = actionGroup && actionGroup.querySelector('.el-button--primary')
    var quantityInput = actionGroup && actionGroup.querySelector('input[type="number"]')
    if (!actionGroup || !orderButton || !quantityInput) return

    var workbench = document.createElement('div')
    workbench.id = PANEL_ID
    workbench.className = 'flex-scheduling-workbench'
    workbench.innerHTML =
      '<section class="flex-config-card">' +
        '<header><div><i class="el-icon-setting"></i><strong>排产参数</strong></div><span>调整参数后生成可执行方案</span></header>' +
        '<div class="flex-config-grid">' +
          '<label><span>期望交付时间</span><input class="flex-field" data-field="deadline" type="date"></label>' +
          '<label><span>订单优先级</span><div class="flex-priority" data-field="priority"><button type="button" class="active" data-value="normal">常规</button><button type="button" data-value="urgent">加急</button><button type="button" data-value="critical">插单</button></div></label>' +
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
    var defaultDeadline = new Date(Date.now() + 3 * 86400000)
    deadline.value = formatDate(defaultDeadline, false)
    deadline.min = formatDate(new Date(), false)

    var state = { generated: false, calculating: false, priority: 'normal', timer: null }
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
      var progressBar = result.querySelector('.flex-load i')
      var progressValue = result.querySelector('.flex-load strong')
      var calculationStartedAt = Date.now()
      state.timer = window.setInterval(function () {
        var progress = Math.min(100, Math.round((Date.now() - calculationStartedAt) / 20))
        progressBar.style.width = progress + '%'
        progressValue.textContent = progress + '%'
        status.textContent = progress < 100 ? '正在计算 ' + progress + '%' : '✓ 方案已生成'
        getButtonLabel(orderButton).textContent = progress < 100 ? '方案计算中 ' + progress + '%' : '确认方案并下发'
        if (progress >= 100) {
          window.clearInterval(state.timer)
          state.timer = null
          state.calculating = false
          state.generated = true
          status.classList.add('ready')
          orderButton.disabled = false
          orderButton.classList.add('is-plan-ready')
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
      if (state.generated) return
      event.preventDefault()
      event.stopImmediatePropagation()
      if (state.calculating) return
      generatePlan()
    }, true)
    getButtonLabel(orderButton).textContent = '生成排产方案'
  }

  function scan() {
    document.querySelectorAll('.custom-product-container').forEach(enhance)
  }

  new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true })
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scan)
  else scan()
})()
