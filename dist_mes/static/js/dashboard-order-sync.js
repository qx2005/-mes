(function () {
  'use strict'

  var STORAGE_KEY = 'mes-dashboard-order-runtime-v1'
  var OVERLAY_ID = 'mes-dashboard-runtime-overlay'
  var STYLE_ID = 'mes-dashboard-runtime-style'
  var DEFAULT_QUANTITY = 100
  var lastRenderedKey = ''
  var mountTimer = null
  var boundsTimer = null

  function pad(value) { return String(value).padStart(2, '0') }

  function monthKey(date) {
    return date.getFullYear() + '-' + pad(date.getMonth() + 1)
  }

  function dayKey(date) {
    return monthKey(date) + '-' + pad(date.getDate())
  }

  function readState() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    } catch (error) {
      return {}
    }
  }

  function writeState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
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

  function resolveQuantity(detail) {
    var workorder = (detail && detail.workorder) || {}
    var quantity = Number(detail && detail.quantity)
    if (!quantity) quantity = Number(workorder.quantity)
    if (!quantity || quantity <= 0) quantity = DEFAULT_QUANTITY
    return DEFAULT_QUANTITY
  }

  function formatRunningTime(startedAt) {
    if (!startedAt) return '0h'
    var minutes = Math.max(1, Math.round((Date.now() - startedAt) / 60000))
    if (minutes < 60) return minutes + 'min'
    return (minutes / 60).toFixed(1) + 'h'
  }

  function buildMetrics(state) {
    return {
      dailyOutput: Number(state.dailyOutput || 0),
      monthlyOutput: Number(state.monthlyOutput || 0),
      monthlyPlan: Number(state.monthlyPlan || DEFAULT_QUANTITY),
      runningTime: formatRunningTime(state.startedAt),
      energyKwh: Number(state.energyKwh || 0).toFixed(1)
    }
  }

  function metricsKey(metrics) {
    return [
      metrics.dailyOutput,
      metrics.monthlyOutput,
      metrics.monthlyPlan,
      metrics.runningTime,
      metrics.energyKwh
    ].join('|')
  }

  function recordOrderSuccess(detail) {
    var now = new Date()
    var today = dayKey(now)
    var month = monthKey(now)
    var quantity = resolveQuantity(detail)
    var state = readState()

    if (state.dayKey !== today) {
      state.dayKey = today
      state.dailyOutput = 0
      state.startedAt = now.getTime()
    }
    if (state.monthKey !== month) {
      state.monthKey = month
      state.monthlyOutput = 0
    }
    if (!state.startedAt) state.startedAt = now.getTime()

    state.orderCount = Number(state.orderCount || 0) + 1
    state.dailyOutput = Number(state.dailyOutput || 0) + quantity
    state.monthlyOutput = Number(state.monthlyOutput || 0) + quantity
    state.monthlyPlan = quantity
    state.lastQuantity = quantity
    state.energyKwh = 118 + state.dailyOutput * 1.26
    state.lastWorkorderCode = (detail && detail.workorder && detail.workorder.workorderCode) || state.lastWorkorderCode || ''
    state.updatedAt = now.getTime()
    writeState(state)
    return buildMetrics(state)
  }

  function syncWorkorderQuantity(detail) {
    var workorder = detail && detail.workorder
    var workorderId = detail && detail.workorderId
    if (!workorderId && workorder) workorderId = workorder.workorderId
    if (!workorderId) return Promise.resolve()

    return request('/mes/pro/workorder/' + encodeURIComponent(workorderId))
      .then(function (body) {
        var current = body.data || workorder || {}
        var payload = Object.assign({}, current, {
          workorderId: current.workorderId || workorderId,
          quantity: DEFAULT_QUANTITY,
          status: current.status && current.status !== 'PREPARE' ? current.status : 'CONFIRMED'
        })
        return request('/mes/pro/workorder', {
          method: 'PUT',
          body: JSON.stringify(payload)
        })
      })
      .catch(function () {})
  }

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return
    var style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent =
      '#' + OVERLAY_ID + '{position:absolute;pointer-events:none;z-index:5;font-family:"Microsoft YaHei",sans-serif;overflow:hidden;}' +
      '#' + OVERLAY_ID + ' .mes-kpi-strip{position:absolute;left:25.8%;top:56.9%;width:44.2%;height:5.8%;display:grid;grid-template-columns:repeat(4,1fr);align-items:center;}' +
      '#' + OVERLAY_ID + ' .mes-kpi-value-slot{display:flex;justify-content:center;align-items:center;color:#fff;font-size:clamp(16px,1.45vw,26px);font-weight:700;line-height:1;text-align:center;min-width:56px;padding:4px 12px;background:rgba(3,17,31,.92);border-radius:4px;}' +
      '#' + OVERLAY_ID + ' .mes-energy-grid{position:absolute;left:1.4%;top:80.8%;width:22.8%;height:15.5%;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));grid-template-rows:repeat(2,minmax(0,1fr));gap:8px;}' +
      '#' + OVERLAY_ID + ' .mes-energy-item{display:flex;flex-direction:column;justify-content:center;align-items:center;background:rgba(3,17,31,.82);border:1px solid rgba(65,200,255,.18);border-radius:6px;padding:6px 4px;}' +
      '#' + OVERLAY_ID + ' .mes-energy-item span{color:#8eb6d8;font-size:11px;line-height:1.2;margin-bottom:4px;}' +
      '#' + OVERLAY_ID + ' .mes-energy-item strong{color:#fff;font-size:clamp(14px,1.1vw,18px);font-weight:700;line-height:1.1;}'
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
    overlay.style.left = Math.round(frameRect.left - hostRect.left) + 'px'
    overlay.style.top = Math.round(frameRect.top - hostRect.top) + 'px'
    overlay.style.width = Math.round(frameRect.width) + 'px'
    overlay.style.height = Math.round(frameRect.height) + 'px'
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
  }

  function updateOverlayValues(overlay, metrics) {
    var daily = overlay.querySelector('[data-kpi="dailyOutput"]')
    var monthly = overlay.querySelector('[data-kpi="monthlyOutput"]')
    var plan = overlay.querySelector('[data-kpi="monthlyPlan"]')
    var running = overlay.querySelector('[data-kpi="runningTime"]')
    var power = overlay.querySelector('[data-energy="power"]')
    var total = overlay.querySelector('[data-energy="total"]')
    if (daily) daily.textContent = metrics.dailyOutput
    if (monthly) monthly.textContent = metrics.monthlyOutput
    if (plan) plan.textContent = metrics.monthlyPlan
    if (running) running.textContent = metrics.runningTime
    if (power) power.textContent = metrics.energyKwh + ' kW'
    if (total) total.textContent = (Number(metrics.energyKwh) * 2.4).toFixed(1) + ' kWh'
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
    var detail = event && event.detail
    recordOrderSuccess(detail)
    syncWorkorderQuantity(detail).finally(function () {
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
    var metrics = buildMetrics(readState())
    if (!document.getElementById(OVERLAY_ID)) {
      renderOverlay(metrics, true)
      return
    }
    var runningNode = document.querySelector('#' + OVERLAY_ID + ' [data-kpi="runningTime"]')
    if (runningNode && runningNode.textContent !== metrics.runningTime) {
      runningNode.textContent = metrics.runningTime
      lastRenderedKey = metricsKey(metrics)
    }
    syncOverlayBounds()
  }, 60000)
})()
