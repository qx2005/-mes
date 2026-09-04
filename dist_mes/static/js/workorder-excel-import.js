(function () {
  'use strict'

  var BUTTON_ID = 'workorder-excel-import-button'
  var INPUT_ID = 'workorder-excel-import-input'
  var REQUIRED_HEADERS = ['工单编码', '工单名称', '来源单据', '产品编号', '产品名称', '客户名称']

  function notify(message, type) {
    var app = document.querySelector('#app')
    var vm = app && app.__vue__
    if (vm && vm.$message) {
      vm.$message({ message: message, type: type || 'info', duration: 3500 })
      return
    }
    window.alert(message)
  }

  function getToken() {
    var match = document.cookie.match(/(?:^|;\s*)Admin-Token=([^;]+)/)
    return match ? decodeURIComponent(match[1]) : ''
  }

  function api(path, options) {
    var settings = options || {}
    var headers = Object.assign({ 'Content-Type': 'application/json;charset=UTF-8' }, settings.headers || {})
    var token = getToken()
    if (token) headers.Authorization = 'Bearer ' + token
    return fetch('/prod-api' + path, Object.assign({}, settings, { headers: headers })).then(function (response) {
      return response.json().then(function (body) {
        if (!response.ok || (body.code !== undefined && body.code !== 200)) {
          throw new Error(body.msg || ('请求失败（' + response.status + '）'))
        }
        return body
      })
    })
  }

  function columnIndex(reference) {
    var letters = String(reference || '').replace(/[^A-Z]/gi, '').toUpperCase()
    var value = 0
    for (var i = 0; i < letters.length; i += 1) value = value * 26 + letters.charCodeAt(i) - 64
    return value - 1
  }

  function readXmlText(node) {
    return Array.prototype.map.call(node.querySelectorAll('t'), function (item) {
      return item.textContent || ''
    }).join('')
  }

  function parseSheet(xmlText, sharedStrings) {
    var xml = new DOMParser().parseFromString(xmlText, 'application/xml')
    if (xml.querySelector('parsererror')) throw new Error('Excel 工作表格式无法识别')
    return Array.prototype.map.call(xml.querySelectorAll('sheetData row'), function (row) {
      var values = []
      Array.prototype.forEach.call(row.querySelectorAll('c'), function (cell) {
        var index = columnIndex(cell.getAttribute('r'))
        var type = cell.getAttribute('t')
        var valueNode = cell.querySelector('v')
        var value = valueNode ? valueNode.textContent : ''
        if (type === 's') value = sharedStrings[Number(value)] || ''
        else if (type === 'inlineStr') value = readXmlText(cell)
        values[index] = String(value || '').trim()
      })
      return values
    }).filter(function (row) { return row.some(function (value) { return value !== '' }) })
  }

  function parseWorkbook(file) {
    if (!window.JSZip) return Promise.reject(new Error('Excel 解析组件未加载'))
    return window.JSZip.loadAsync(file).then(function (zip) {
      var sharedEntry = zip.file('xl/sharedStrings.xml')
      var sharedPromise = sharedEntry ? sharedEntry.async('string').then(function (xmlText) {
        var xml = new DOMParser().parseFromString(xmlText, 'application/xml')
        return Array.prototype.map.call(xml.querySelectorAll('si'), readXmlText)
      }) : Promise.resolve([])
      var sheetEntry = zip.file('xl/worksheets/sheet1.xml')
      if (!sheetEntry) throw new Error('Excel 中未找到第一个工作表')
      return Promise.all([sharedPromise, sheetEntry.async('string')])
    }).then(function (parts) {
      var rows = parseSheet(parts[1], parts[0])
      if (rows.length < 2) throw new Error('Excel 中没有可导入的工单数据')
      var headers = rows[0]
      REQUIRED_HEADERS.forEach(function (header) {
        if (headers.indexOf(header) < 0) throw new Error('缺少必填列：' + header)
      })
      return rows.slice(1).map(function (row, rowIndex) {
        var record = {}
        headers.forEach(function (header, index) { record[header] = row[index] || '' })
        if (!record['工单编码'] || !record['工单名称'] || !record['产品编号'] || !record['产品名称']) {
          throw new Error('第 ' + (rowIndex + 2) + ' 行必填内容不完整')
        }
        return record
      })
    })
  }

  function pad(value) {
    return String(value).padStart(2, '0')
  }

  function currentDateToken(date) {
    return date.getFullYear() + pad(date.getMonth() + 1) + pad(date.getDate())
  }

  function currentDateTime(date) {
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) +
      ' ' + pad(date.getHours()) + ':' + pad(date.getMinutes()) + ':' + pad(date.getSeconds())
  }

  function realtimeDocumentCode(originalCode, fallbackPrefix, sequence, date) {
    var code = String(originalCode || '').trim()
    var dateToken = currentDateToken(date)
    var serial = String(sequence + 1).padStart(3, '0')
    if (!code) return fallbackPrefix + '-' + dateToken + '-' + serial
    if (/\d{8}/.test(code)) return code.replace(/\d{8}/, dateToken).replace(/\d{3}$/, serial)
    return code + '-' + dateToken + '-' + serial
  }

  function numberValue(value, fallback) {
    if (value === undefined || value === null || String(value).trim() === '') return fallback
    var parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
  }

  function defaultSpecification(record) {
    var productName = String(record['产品名称'] || '')
    if (productName.indexOf('小麦') >= 0 || productName.indexOf('啤酒') >= 0) return '500ml×24罐'
    return '标准包装'
  }

  function realtimeBatchCode(originalCode, sequence, date) {
    var dateToken = currentDateToken(date)
    var serial = String(sequence + 1).padStart(3, '0')
    var code = String(originalCode || '').trim()
    if (!code) return 'LOT-' + dateToken + '-' + serial
    if (/\d{8}/.test(code)) return code.replace(/\d{8}/, dateToken).replace(/\d{3}$/, serial)
    return code
  }

  function defaultClientCode(record, sequence) {
    var code = String(record['客户编码'] || '').trim()
    if (code) return code
    return 'KH' + String(sequence + 1).padStart(3, '0')
  }

  function findProduct(record) {
    return api('/mes/md/mditem/list?pageNum=1&pageSize=10&itemCode=' + encodeURIComponent(record['产品编号']))
      .then(function (response) {
        var rows = response.rows || response.data || []
        return Array.isArray(rows) ? rows[0] : null
      })
  }

  function findProductType() {
    return api('/mes/md/itemtype/list?itemOrProduct=PRODUCT&enableFlag=Y').then(function (response) {
      var types = response.data || []
      if (!Array.isArray(types)) types = []
      return types.find(function (item) { return item.itemTypeName === '成品' }) ||
        types.find(function (item) { return Number(item.parentTypeId) !== 0 }) ||
        types[0] || null
    })
  }

  function ensureProductType() {
    return findProductType().then(function (itemType) {
      if (itemType) return itemType
      return api('/mes/md/itemtype', {
        method: 'POST',
        body: JSON.stringify({
          itemTypeName: '导入成品',
          parentTypeId: 0,
          ancestors: '0',
          itemOrProduct: 'PRODUCT',
          orderNum: 99,
          enableFlag: 'Y'
        })
      }).then(findProductType)
    }).then(function (itemType) {
      if (!itemType) throw new Error('未能匹配或创建成品类型')
      return itemType
    })
  }

  function ensureProduct(record) {
    return findProduct(record).then(function (product) {
      if (product) return product
      return ensureProductType().then(function (itemType) {
        return api('/mes/md/mditem', {
          method: 'POST',
          body: JSON.stringify({
            itemCode: record['产品编号'],
            itemName: record['产品名称'],
            specification: record['规格型号'] || defaultSpecification(record),
            itemTypeId: itemType.itemTypeId,
            itemTypeCode: itemType.itemTypeCode,
            itemTypeName: itemType.itemTypeName,
            unitOfMeasure: 'PCS',
            itemOrProduct: 'PRODUCT',
            enableFlag: 'Y',
            safeStockFlag: 'N',
            attr1: 'EXCEL_IMPORT'
          })
        })
      }).then(function () { return findProduct(record) })
    }).then(function (product) {
      if (!product) throw new Error('产品 ' + record['产品编号'] + ' 建档失败')
      return product
    })
  }

  function importRecord(record, sequence) {
    return ensureProduct(record).then(function (product) {
      var importedAt = new Date()
      var workorderCode = realtimeDocumentCode(record['工单编码'], 'WO', sequence, importedAt)
      var sourceCode = realtimeDocumentCode(record['来源单据'], 'SO', sequence, importedAt)
      var specification = record['规格型号'] || product.specification || defaultSpecification(record)
      var quantity = Math.max(1, numberValue(record['工单数量'], 100))
      var quantityChanged = numberValue(record['调整数量'], 0)
      var batchCode = realtimeBatchCode(record['批次号'], sequence, importedAt)
      var clientCode = defaultClientCode(record, sequence)
      return api('/mes/pro/workorder', {
        method: 'POST',
        body: JSON.stringify({
          workorderCode: workorderCode,
          workorderName: record['工单名称'],
          orderSource: 'ORDER',
          sourceCode: sourceCode,
          productId: product.itemId,
          productCode: record['产品编号'],
          productName: record['产品名称'],
          productSpc: specification,
          unitOfMeasure: product.unitOfMeasure || 'PCS',
          quantity: quantity,
          quantityProduced: 0,
          quantityChanged: quantityChanged,
          quantityScheduled: 0,
          batchCode: batchCode,
          clientCode: clientCode,
          clientName: record['客户名称'] || '',
          requestDate: currentDateTime(importedAt),
          parentId: 0,
          ancestors: '0',
          status: 'PREPARE',
          attr1: 'EXCEL_IMPORT'
        })
      })
    })
  }

  function importRows(rows, button) {
    var completed = 0
    button.disabled = true
    button.classList.add('is-loading')
    button.querySelector('span').textContent = '正在导入 0/' + rows.length
    return rows.reduce(function (chain, record, sequence) {
      return chain.then(function () {
        return importRecord(record, sequence).then(function () {
          completed += 1
          button.querySelector('span').textContent = '正在导入 ' + completed + '/' + rows.length
        })
      })
    }, Promise.resolve()).then(function () {
      notify('成功导入 ' + completed + ' 条生产工单', 'success')
      window.setTimeout(function () { window.location.reload() }, 700)
    }).catch(function (error) {
      button.disabled = false
      button.classList.remove('is-loading')
      button.querySelector('span').textContent = '一键导入'
      throw error
    })
  }

  function removeAdjustmentQuantityColumn() {
    if (location.pathname.indexOf('/mes/pro/workorder') < 0) return
    var tables = document.querySelectorAll('.app-container .el-table')
    Array.prototype.forEach.call(tables, function (table) {
      var headers = table.querySelectorAll('.el-table__header-wrapper th')
      Array.prototype.forEach.call(headers, function (header) {
        if (header.textContent.trim() !== '调整数量') return
        var columnClass = Array.prototype.find.call(header.classList, function (className) {
          return /^el-table_\d+_column_\d+$/.test(className)
        })
        if (!columnClass) return
        var styleId = 'hide-' + columnClass
        if (document.getElementById(styleId)) return
        var style = document.createElement('style')
        style.id = styleId
        style.textContent =
          '.' + columnClass + '{display:none!important;width:0!important;}' +
          'col[name="' + columnClass + '"]{display:none!important;width:0!important;}'
        document.head.appendChild(style)
        table.setAttribute('data-adjustment-column-removed', 'true')
      })
    })
  }

  function enhance() {
    if (location.pathname.indexOf('/mes/pro/workorder') < 0) return
    removeAdjustmentQuantityColumn()
    if (document.getElementById(BUTTON_ID)) return
    var buttons = Array.prototype.slice.call(document.querySelectorAll('.app-container .el-button'))
    var addButton = buttons.find(function (button) { return button.textContent.trim() === '新增' })
    if (!addButton || !addButton.parentElement) return

    var button = document.createElement('button')
    button.id = BUTTON_ID
    button.type = 'button'
    button.className = 'el-button el-button--success el-button--mini workorder-import-button'
    button.innerHTML = '<i class="el-icon-upload2"></i><span>一键导入</span>'
    var input = document.createElement('input')
    input.id = INPUT_ID
    input.type = 'file'
    input.accept = '.xlsx'
    input.hidden = true
    addButton.parentElement.insertBefore(button, addButton.nextSibling)
    addButton.parentElement.insertBefore(input, button.nextSibling)

    button.addEventListener('click', function () { input.click() })
    input.addEventListener('change', function () {
      var file = input.files && input.files[0]
      if (!file) return
      if (!/\.xlsx$/i.test(file.name)) {
        notify('请选择 .xlsx 格式的工单文件', 'warning')
        input.value = ''
        return
      }
      parseWorkbook(file).then(function (rows) {
        return importRows(rows, button)
      }).catch(function (error) {
        notify('导入失败：' + error.message, 'error')
      }).finally(function () { input.value = '' })
    })
  }

  new MutationObserver(enhance).observe(document.documentElement, { childList: true, subtree: true })
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', enhance)
  else enhance()
})()
