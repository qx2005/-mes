(function () {
  'use strict'

  if (window.__mesRouteQrcodeViewLoaded) return
  window.__mesRouteQrcodeViewLoaded = true

  var STYLE_ID = 'route-qrcode-view-style'
  var MODAL_ID = 'route-qrcode-view-modal'
  var BUTTON_CLASS = 'route-qrcode-view-button'
  var QR_LIB_URL = '/static/js/qrcode.min.js?v=1.0.0'
  var qrLibPromise = null

  function currentLocation() {
    return (location.pathname + location.search + location.hash).toLowerCase()
  }

  function isRoutePage() {
    if (currentLocation().indexOf('/mes/pro/proroute') >= 0) return true
    var headers = document.querySelectorAll('.app-container .el-table th .cell')
    for (var i = 0; i < headers.length; i++) {
      if ((headers[i].textContent || '').trim() === '\u5de5\u827a\u8def\u7ebf\u7f16\u53f7') return true
    }
    return false
  }

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return
    var style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent =
      '.' + BUTTON_CLASS + '{margin-right:8px;}' +
      '#' + MODAL_ID + '{position:fixed;inset:0;z-index:4000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.45);}' +
      '#' + MODAL_ID + ' .route-qrcode-card{width:min(92vw,420px);background:#fff;border-radius:8px;box-shadow:0 12px 32px rgba(0,0,0,.18);overflow:hidden;}' +
      '#' + MODAL_ID + ' .route-qrcode-head{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid #ebeef5;font-size:16px;font-weight:600;color:#303133;}' +
      '#' + MODAL_ID + ' .route-qrcode-close{border:0;background:transparent;font-size:20px;line-height:1;color:#909399;cursor:pointer;}' +
      '#' + MODAL_ID + ' .route-qrcode-body{padding:20px 24px 24px;text-align:center;}' +
      '#' + MODAL_ID + ' .route-qrcode-canvas{display:flex;justify-content:center;margin:0 auto 16px;}' +
      '#' + MODAL_ID + ' .route-qrcode-meta{color:#606266;font-size:14px;line-height:1.8;}' +
      '#' + MODAL_ID + ' .route-qrcode-meta strong{color:#303133;}'
    document.head.appendChild(style)
  }

  function loadQrLibrary() {
    if (window.QRCode) return Promise.resolve()
    if (qrLibPromise) return qrLibPromise
    qrLibPromise = new Promise(function (resolve, reject) {
      var script = document.createElement('script')
      script.src = QR_LIB_URL
      script.async = true
      script.onload = function () { resolve() }
      script.onerror = function () { reject(new Error('Failed to load QR library')) }
      document.head.appendChild(script)
    })
    return qrLibPromise
  }

  function readRowData(row) {
    var cells = row.querySelectorAll('td')
    if (!cells.length) return null
    var start = cells[0].querySelector('.el-checkbox') ? 1 : 0
    return {
      routeCode: (cells[start] && cells[start].textContent || '').trim(),
      routeName: (cells[start + 1] && cells[start + 1].textContent || '').trim(),
      routeDesc: (cells[start + 2] && cells[start + 2].textContent || '').trim(),
      remark: (cells[start + 4] && cells[start + 4].textContent || '').trim()
    }
  }

  function buildQrPayload(route) {
    return JSON.stringify({
      type: 'MES_ROUTE_TRACE',
      routeCode: route.routeCode,
      routeName: route.routeName
    })
  }

  function closeModal() {
    var modal = document.getElementById(MODAL_ID)
    if (modal) modal.remove()
  }

  function openModal(route) {
    ensureStyles()
    closeModal()

    var modal = document.createElement('div')
    modal.id = MODAL_ID
    modal.innerHTML =
      '<div class="route-qrcode-card">' +
        '<div class="route-qrcode-head">' +
          '<span>\u67e5\u770b\u4e8c\u7ef4\u7801</span>' +
          '<button type="button" class="route-qrcode-close" aria-label="close">&times;</button>' +
        '</div>' +
        '<div class="route-qrcode-body">' +
          '<div class="route-qrcode-canvas" id="route-qrcode-canvas"></div>' +
          '<div class="route-qrcode-meta">' +
            '<div><strong>\u5de5\u827a\u8def\u7ebf\u7f16\u53f7\uff1a</strong>' + route.routeCode + '</div>' +
            '<div><strong>\u5de5\u827a\u8def\u7ebf\u540d\u79f0\uff1a</strong>' + route.routeName + '</div>' +
            '<div>\u626b\u7801\u53ef\u67e5\u8be2\u4ea7\u54c1\u751f\u4ea7\u3001\u8d28\u68c0\u53ca\u5165\u5e93\u4fe1\u606f</div>' +
          '</div>' +
        '</div>' +
      '</div>'

    modal.addEventListener('click', function (event) {
      if (event.target === modal || event.target.closest('.route-qrcode-close')) closeModal()
    })
    document.body.appendChild(modal)

    loadQrLibrary().then(function () {
      var host = document.getElementById('route-qrcode-canvas')
      if (!host || !window.QRCode) return
      host.innerHTML = ''
      new window.QRCode(host, {
        text: buildQrPayload(route),
        width: 220,
        height: 220,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: window.QRCode.CorrectLevel.M
      })
    }).catch(function () {
      var host = document.getElementById('route-qrcode-canvas')
      if (host) host.textContent = 'QR library load failed'
    })
  }

  function findActionCell(row) {
    var cells = row.querySelectorAll('td')
    for (var i = cells.length - 1; i >= 0; i--) {
      var text = (cells[i].textContent || '').trim()
      if (cells[i].querySelector('.el-button') && (text.indexOf('\u4fee\u6539') >= 0 || text.indexOf('\u5220\u9664') >= 0)) {
        return cells[i]
      }
    }
    return row.querySelector('td:last-child')
  }

  function insertActionButton(actionCell, button) {
    var container = actionCell.querySelector('.cell') || actionCell
    var firstAction = container.querySelector('.el-button:not(.' + BUTTON_CLASS + ')')
    if (firstAction && firstAction.parentElement) {
      firstAction.parentElement.insertBefore(button, firstAction)
      return
    }
    container.appendChild(button)
  }

  function bindRowButton(row) {
    var actionCell = findActionCell(row)
    if (!actionCell || actionCell.querySelector('.' + BUTTON_CLASS)) return

    var route = readRowData(row)
    if (!route || !route.routeCode) return

    var button = document.createElement('button')
    button.type = 'button'
    button.className = 'el-button el-button--text el-button--mini ' + BUTTON_CLASS
    button.innerHTML = '<i class="el-icon-view"></i><span>\u67e5\u770b\u4e8c\u7ef4\u7801</span>'
    button.addEventListener('click', function (event) {
      event.preventDefault()
      event.stopPropagation()
      openModal(route)
    })

    insertActionButton(actionCell, button)
  }

  function scan() {
    if (!isRoutePage()) return
    document.querySelectorAll('.app-container .el-table__body-wrapper tbody tr').forEach(bindRowButton)
  }

  function hookHistoryNavigation() {
    var originalPushState = history.pushState
    var originalReplaceState = history.replaceState
    history.pushState = function () {
      var result = originalPushState.apply(this, arguments)
      window.setTimeout(scan, 0)
      return result
    }
    history.replaceState = function () {
      var result = originalReplaceState.apply(this, arguments)
      window.setTimeout(scan, 0)
      return result
    }
    window.addEventListener('popstate', function () { window.setTimeout(scan, 0) })
    window.addEventListener('hashchange', scan)
  }

  hookHistoryNavigation()
  new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true })
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scan)
  } else {
    scan()
  }
  window.setInterval(scan, 2000)
})()
