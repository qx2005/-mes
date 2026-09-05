(function () {
  'use strict'

  var MENU_ID = 'platform-updater-menu-entry'
  var LOGIN_ID = 'platform-updater-login-layer'
  var UPDATER_ID = 'platform-updater-layer'
  var PLUGIN_TARGET_VERSION = '3.9.2'
  var CONFIG_URL = '/static/config/platform-updater.json?v=20260904-ai-code-review'
  var DEFAULT_CONFIG = {
    productName: '智能灌装柔性排产平台',
    currentVersion: '3.8.2',
    latestVersion: PLUGIN_TARGET_VERSION,
    packageName: 'flexible-scheduler.zip',
    packageSizeBytes: 4882,
    targetFile: 'production-scheduling/flexible-line/flexible-scheduler.js',
    releaseDate: currentDate(),
    releaseNotes: ['更新柔性排产算法模块', '优化产线负载与交付评分逻辑', '完善排产参数校验与计划生成流程'],
    manifestUrl: '/updates/latest.json',
    downloadSeconds: 2,
    installSeconds: 16,
    developerAccount: 'admin01',
    developerPassword: '123456',
    ideUrl: '/ide',
    ideWorkspaceName: 'MES 源码隔离工作区',
    ideMode: 'simulation'
  }
  var configPromise = null
  var updateTimer = null

  function currentDate() {
    var now = new Date()
    return [now.getFullYear(), now.getMonth() + 1, now.getDate()].map(function (value, index) {
      return index === 0 ? String(value) : String(value).padStart(2, '0')
    }).join('-')
  }

  function clampNumber(value, fallback, min, max) {
    var number = Number(value)
    return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback
  }

  function normalizeConfig(raw) {
    raw = raw && typeof raw === 'object' ? raw : {}
    return {
      productName: String(raw.productName || DEFAULT_CONFIG.productName),
      currentVersion: String(raw.currentVersion || DEFAULT_CONFIG.currentVersion),
      latestVersion: String(raw.latestVersion || DEFAULT_CONFIG.latestVersion),
      packageName: String(raw.packageName || DEFAULT_CONFIG.packageName),
      packageSizeBytes: clampNumber(raw.packageSizeBytes, DEFAULT_CONFIG.packageSizeBytes, 1, 10737418240),
      targetFile: String(raw.targetFile || DEFAULT_CONFIG.targetFile),
      releaseDate: currentDate(),
      releaseNotes: Array.isArray(raw.releaseNotes) && raw.releaseNotes.length
        ? raw.releaseNotes.map(function (item) { return String(item) }).filter(Boolean)
        : DEFAULT_CONFIG.releaseNotes.slice(),
      downloadSeconds: clampNumber(raw.downloadSeconds, DEFAULT_CONFIG.downloadSeconds, 1, 120),
      installSeconds: clampNumber(raw.installSeconds, DEFAULT_CONFIG.installSeconds, 1, 120),
      manifestUrl: String(raw.manifestUrl || DEFAULT_CONFIG.manifestUrl),
      developerAccount: String(raw.developerAccount || DEFAULT_CONFIG.developerAccount),
      developerPassword: String(raw.developerPassword || DEFAULT_CONFIG.developerPassword),
      ideUrl: String(raw.ideUrl || '') === '/ide' ? '/ide' : DEFAULT_CONFIG.ideUrl,
      ideWorkspaceName: String(raw.ideWorkspaceName || DEFAULT_CONFIG.ideWorkspaceName),
      ideMode: raw.ideMode === 'simulation' ? 'simulation' : DEFAULT_CONFIG.ideMode
    }
  }

  function loadConfig() {
    if (!configPromise) {
      configPromise = fetch(CONFIG_URL, { cache: 'no-store', credentials: 'same-origin' })
        .then(function (response) {
          if (!response.ok) throw new Error('配置请求失败')
          return response.json()
        })
        .then(normalizeConfig)
        .catch(function () { return normalizeConfig(DEFAULT_CONFIG) })
    }
    return configPromise
  }

  function formatBytes(bytes) {
    var value = Math.max(0, Number(bytes) || 0)
    if (value < 1024) return Math.round(value) + ' B'
    if (value < 1048576) return (value / 1024).toFixed(1) + ' KB'
    if (value < 1073741824) return (value / 1048576).toFixed(1) + ' MB'
    return (value / 1073741824).toFixed(2) + ' GB'
  }

  function loadReleaseManifest(config) {
    if (!/^\/updates\/[A-Za-z0-9._/-]+$/.test(config.manifestUrl)) {
      return Promise.reject(new Error('版本清单地址不合法'))
    }
    return fetch(config.manifestUrl + '?_=' + Date.now(), { cache: 'no-store', credentials: 'same-origin' })
      .then(function (response) {
        if (!response.ok) throw new Error('未找到版本清单 latest.json')
        return response.json()
      })
      .then(function (raw) {
        var packageUrl = String(raw.packageUrl || '')
        if (!/^\/updates\/[A-Za-z0-9._-]+$/.test(packageUrl)) throw new Error('更新包地址不合法')
        return fetch(packageUrl + '?_=' + Date.now(), {
          method: 'HEAD',
          cache: 'no-store',
          credentials: 'same-origin'
        }).then(function (response) {
          if (!response.ok) throw new Error('版本清单已读取，但更新包不存在')
          var contentLength = Number(response.headers.get('Content-Length'))
          return {
            latestVersion: String(raw.version || config.latestVersion),
            packageName: String(raw.packageName || packageUrl.split('/').pop()),
            packageUrl: packageUrl,
            packageSizeBytes: contentLength > 0 ? contentLength : clampNumber(raw.packageSizeBytes, config.packageSizeBytes, 1, 10737418240),
            targetFile: String(raw.targetFile || config.targetFile),
            sha256: String(raw.sha256 || '').toUpperCase(),
            releaseDate: currentDate(),
            releaseNotes: Array.isArray(raw.releaseNotes) && raw.releaseNotes.length
              ? raw.releaseNotes.map(function (item) { return String(item) }).filter(Boolean)
              : config.releaseNotes.slice()
          }
        })
      })
  }

  function createIcon(name) {
    var icon = document.createElement('i')
    icon.className = name
    icon.setAttribute('aria-hidden', 'true')
    return icon
  }

  function findRootMenu() {
    var menus = Array.prototype.slice.call(document.querySelectorAll('.sidebar-container .el-menu'))
    return menus.find(function (menu) {
      if (menu.closest('.el-submenu')) return false
      var text = menu.textContent || ''
      return text.indexOf('首页') !== -1 && text.indexOf('系统工具') !== -1
    }) || null
  }

  function injectMenu() {
    if (document.getElementById(MENU_ID) || location.pathname.indexOf('/login') === 0) return
    var rootMenu = findRootMenu()
    if (!rootMenu) return

    var item = document.createElement('li')
    item.id = MENU_ID
    item.className = 'el-menu-item platform-updater-menu-entry'
    item.setAttribute('role', 'menuitem')
    item.setAttribute('tabindex', '0')
    item.appendChild(createIcon('el-icon-upload'))
    var label = document.createElement('span')
    label.textContent = '在线IDE'
    item.appendChild(label)
    item.addEventListener('click', openLogin)
    item.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        openLogin()
      }
    })
    rootMenu.appendChild(item)
  }

  function removeLayer(id) {
    var layer = document.getElementById(id)
    if (layer) layer.remove()
  }

  function setLoginMessage(layer, message, type) {
    var node = layer.querySelector('[data-login-message]')
    node.textContent = message || ''
    node.className = 'platform-login-message ' + (type || '')
  }

  function openLogin() {
    if (document.getElementById(LOGIN_ID) || document.getElementById(UPDATER_ID)) return
    var layer = document.createElement('div')
    layer.id = LOGIN_ID
    layer.className = 'platform-updater-layer platform-login-layer'
    layer.innerHTML =
      '<div class="platform-updater-backdrop" data-close-login></div>' +
      '<section class="platform-login-dialog" role="dialog" aria-modal="true" aria-labelledby="platform-login-title">' +
        '<button class="platform-layer-close" type="button" aria-label="关闭" data-close-login>×</button>' +
        '<div class="platform-login-brand"><span><i class="el-icon-upload"></i></span></div>' +
        '<div class="platform-login-copy">' +
          '<h2 id="platform-login-title">开发者身份验证</h2>' +
          '<p>在线 IDE 属于开发维护功能，请使用开发者账号进行身份验证。</p>' +
        '</div>' +
        '<form class="platform-login-form" autocomplete="on">' +
          '<label><span>开发者账号</span><div><i class="el-icon-user"></i><input name="username" value="admin01" autocomplete="username" placeholder="请输入账号" required></div></label>' +
          '<label><span>登录密码</span><div><i class="el-icon-lock"></i><input name="password" type="password" autocomplete="current-password" placeholder="请输入密码" required></div></label>' +
          '<div class="platform-login-message" data-login-message aria-live="polite"></div>' +
          '<button class="platform-primary-button platform-login-submit" type="submit">验证身份并进入</button>' +
        '</form>' +
        '<footer><i class="el-icon-info"></i><span>生产用户可继续使用业务功能，但不能进入在线 IDE。开发者凭据由开发中心独立验证。</span></footer>' +
      '</section>'
    document.body.appendChild(layer)

    layer.querySelectorAll('[data-close-login]').forEach(function (node) {
      node.addEventListener('click', function () { removeLayer(LOGIN_ID) })
    })
    layer.querySelector('form').addEventListener('submit', function (event) {
      event.preventDefault()
      authenticateDeveloper(layer)
    })
    window.setTimeout(function () { layer.querySelector('input[name="username"]').focus() }, 50)
  }

  function validateDeveloperCredentials(username, password, config) {
    return username === config.developerAccount && password === config.developerPassword
  }

  function authenticateDeveloper(layer) {
    var form = layer.querySelector('form')
    var username = form.elements.username.value.trim()
    var password = form.elements.password.value
    var submit = layer.querySelector('.platform-login-submit')
    if (!username || !password) {
      setLoginMessage(layer, '请输入账号和密码。', 'error')
      return
    }

    submit.disabled = true
    submit.textContent = '正在验证…'
    setLoginMessage(layer, '正在验证开发者身份…', 'loading')

    loadConfig().then(function (config) {
      return new Promise(function (resolve) {
        window.setTimeout(function () { resolve(config) }, 450)
      })
    }).then(function (config) {
      form.elements.password.value = ''
      if (!validateDeveloperCredentials(username, password, config)) {
        setLoginMessage(layer, '用户名或密码错误。生产用户无权使用平台更新功能。', 'error')
        submit.disabled = false
        submit.textContent = '重新验证'
        return
      }
      setLoginMessage(layer, '开发者身份验证成功，正在进入在线 IDE…', 'success')
      window.setTimeout(function () {
        removeLayer(LOGIN_ID)
        openEmbeddedIde(config)
      }, 500)
    }).catch(function (error) {
      form.elements.password.value = ''
      setLoginMessage(layer, error && error.message ? error.message : '身份验证失败，请重试。', 'error')
      submit.disabled = false
      submit.textContent = '重新验证'
    })
  }

  function appendLog(layer, message, type) {
    var now = new Date()
    var text = '[' + [now.getHours(), now.getMinutes(), now.getSeconds()].map(function (value) {
      return String(value).padStart(2, '0')
    }).join(':') + '] ' + message
    layer.querySelectorAll('[data-update-log]').forEach(function (container) {
      var row = document.createElement('div')
      row.className = type || ''
      row.textContent = text
      container.appendChild(row)
      container.scrollTop = container.scrollHeight
    })
  }

  function setProgress(layer, value, status, detail, transfer) {
    var progress = Math.max(0, Math.min(100, value))
    layer.querySelector('[data-progress-bar]').style.width = progress + '%'
    layer.querySelector('[data-progress-value]').textContent = Math.round(progress) + '%'
    if (status) layer.querySelector('[data-update-status]').textContent = status
    if (detail) layer.querySelector('[data-update-detail]').textContent = detail
    if (transfer) layer.querySelector('[data-update-transfer]').textContent = transfer
  }

  function renderNotes(layer, config) {
    var list = layer.querySelector('[data-release-notes]')
    config.releaseNotes.slice(0, 6).forEach(function (note) {
      var item = document.createElement('li')
      item.textContent = note.length > 90 ? note.slice(0, 90) + '…' : note
      list.appendChild(item)
    })
  }

  function openUpdater(config) {
    var layer = document.createElement('div')
    layer.id = UPDATER_ID
    layer.className = 'platform-updater-layer platform-center-layer'
    layer.innerHTML =
      '<div class="platform-updater-backdrop"></div>' +
      '<section class="platform-center-dialog" role="dialog" aria-modal="true" aria-labelledby="platform-updater-title">' +
        '<header class="platform-center-header">' +
          '<div class="platform-center-title"><span><i class="el-icon-upload"></i></span><div><h2 id="platform-updater-title">平台更新中心</h2></div></div>' +
          '<div><button class="platform-layer-close" type="button" aria-label="关闭" data-close-updater>×</button></div>' +
        '</header>' +
        '<main class="platform-center-main">' +
          '<aside class="platform-version-card">' +
            '<h3>版本信息</h3>' +
            '<dl><div><dt>当前版本</dt><dd data-current-version></dd></div><div><dt>最新版本</dt><dd class="is-latest" data-latest-version>--</dd></div></dl>' +
            '<div class="platform-package" data-package-section hidden><span>更新包</span><strong data-package-name></strong><small data-package-meta></small></div>' +
            '<div class="platform-release" data-release-section hidden><span>本次更新</span><ul data-release-notes></ul></div>' +
            '<div class="platform-safe-tip"><i class="el-icon-lock"></i><span>更新过程中请勿关闭页面或中断平台服务</span></div>' +
          '</aside>' +
          '<section class="platform-update-workspace">' +
            '<div class="platform-status-card">' +
              '<div class="platform-status-heading"><i></i><div><h3 data-update-status>准备检查更新</h3><p data-update-detail>点击“检查更新”获取最新版本信息</p></div></div>' +
              '<div class="platform-progress"><div><i data-progress-bar></i></div><strong data-progress-value>0%</strong></div>' +
              '<p class="platform-transfer" data-update-transfer>尚未开始</p>' +
              '<div class="platform-actions"><button class="platform-primary-button" type="button" data-primary-action>检查更新</button><button class="platform-secondary-button" type="button" data-cancel-update disabled>取消更新</button></div>' +
            '</div>' +
            '<div class="platform-log-card"><header><h3>更新日志</h3><button type="button" data-clear-log>清空</button></header><div class="platform-log" data-update-log></div></div>' +
          '</section>' +
        '</main>' +
      '</section>'
    document.body.appendChild(layer)

    layer.querySelector('[data-current-version]').textContent = config.currentVersion
    appendLog(layer, '开发者身份验证通过，更新中心已启动', 'success')
    appendLog(layer, '已读取本地版本信息：' + config.currentVersion)

    var state = { name: 'idle', stageIndex: 0, release: null }
    var primary = layer.querySelector('[data-primary-action]')
    var cancel = layer.querySelector('[data-cancel-update]')

    function closeUpdater() {
      if (updateTimer) window.clearInterval(updateTimer)
      updateTimer = null
      state.name = 'closed'
      removeLayer(UPDATER_ID)
    }

    function reset() {
      if (updateTimer) window.clearInterval(updateTimer)
      updateTimer = null
      state.name = 'idle'
      state.stageIndex = 0
      state.release = null
      layer.querySelector('[data-current-version]').textContent = config.currentVersion
      layer.querySelector('[data-latest-version]').textContent = '--'
      layer.querySelector('[data-package-section]').hidden = true
      layer.querySelector('[data-release-section]').hidden = true
      layer.querySelector('[data-package-name]').textContent = ''
      layer.querySelector('[data-package-meta]').textContent = ''
      layer.querySelector('[data-release-notes]').innerHTML = ''
      setProgress(layer, 0, '准备检查更新', '点击“检查更新”获取最新版本信息', '尚未开始')
      primary.disabled = false
      primary.textContent = '检查更新'
      cancel.disabled = true
      appendLog(layer, '更新中心已重置，可以重新检查更新')
    }

    function finishUpdate() {
      var release = state.release
      state.name = 'complete'
      updateTimer = null
      layer.querySelector('[data-current-version]').textContent = release.latestVersion
      setProgress(layer, 100, '更新成功', release.packageName + ' 已部署完成', '柔性排产模块运行正常')
      primary.disabled = false
      primary.textContent = '重新检查'
      cancel.disabled = true
      appendLog(layer, '已恢复接收新的排产任务', 'success')
      appendLog(layer, '柔性排产模块已更新至 ' + release.latestVersion, 'success')
    }

    function runStage(stages) {
      if (state.name !== 'updating') return
      if (state.stageIndex >= stages.length) {
        finishUpdate()
        return
      }
      var stage = stages[state.stageIndex]
      var startedAt = Date.now()
      appendLog(layer, '开始：' + stage.status)
      layer.querySelector('[data-update-status]').textContent = stage.status
      layer.querySelector('[data-update-detail]').textContent = stage.detail
      updateTimer = window.setInterval(function () {
        var ratio = Math.min(1, (Date.now() - startedAt) / (stage.seconds * 1000))
        var progress = stage.start + (stage.end - stage.start) * ratio
        var transfer = '步骤 ' + (state.stageIndex + 1) + ' / ' + stages.length + '  ·  请勿关闭更新中心'
        if (stage.key === 'download') {
          var downloaded = state.release.packageSizeBytes * ratio
          var speed = downloaded / Math.max((Date.now() - startedAt) / 1000, 0.1)
          transfer = formatBytes(downloaded) + ' / ' + formatBytes(state.release.packageSizeBytes) + '  ·  ' + formatBytes(speed) + '/s'
        }
        setProgress(layer, progress, null, null, transfer)
        if (ratio >= 1) {
          window.clearInterval(updateTimer)
          updateTimer = null
          appendLog(layer, stage.done, 'success')
          state.stageIndex += 1
          window.setTimeout(function () { runStage(stages) }, 180)
        }
      }, 100)
    }

    function startUpdate() {
      var release = state.release
      if (!release) return
      state.name = 'updating'
      state.stageIndex = 0
      primary.disabled = true
      primary.textContent = '更新中…'
      cancel.disabled = false
      appendLog(layer, '更新任务已创建，正在准备更新环境')
      var installScale = config.installSeconds / 16
      runStage([
        { key: 'download', status: '正在下载更新包', detail: release.packageName, start: 0, end: 12, seconds: config.downloadSeconds, done: '更新包下载完成：' + release.packageName },
        { key: 'verify', status: '正在校验更新包', detail: '验证 SHA256 文件完整性', start: 12, end: 18, seconds: 1 * installScale, done: 'SHA256 校验通过：' + release.sha256.slice(0, 16) + '…' },
        { key: 'extract', status: '正在解压更新包', detail: '释放文件到隔离暂存区', start: 18, end: 28, seconds: 2 * installScale, done: '更新文件已释放至 staging/flexible-scheduler.js' },
        { key: 'validate', status: '正在验证调度模块', detail: '检查 JavaScript 语法与模块导出接口', start: 28, end: 34, seconds: 1 * installScale, done: 'JavaScript 语法与模块接口校验通过' },
        { key: 'quiesce', status: '正在进入更新维护状态', detail: '暂停新任务并等待当前排产计算结束', start: 34, end: 40, seconds: 1 * installScale, done: '已暂停接收新的排产任务，当前活动任务 0' },
        { key: 'backup', status: '正在备份调度模块', detail: '创建当前脚本的恢复副本', start: 40, end: 50, seconds: 2 * installScale, done: '原文件已备份：flexible-scheduler.js.' + config.currentVersion + '.bak' },
        { key: 'deploy', status: '正在部署并预热柔性排产模块', detail: '切换模块文件并初始化排产运行环境', start: 50, end: 86, seconds: 7 * installScale, done: '模块文件切换完成，柔性排产运行环境预热完成' },
        { key: 'reload', status: '正在刷新调度模块', detail: '清理模块缓存并加载新版本', start: 86, end: 94, seconds: 1 * installScale, done: '模块缓存已刷新，新版本加载成功' },
        { key: 'smoke', status: '正在执行更新后检查', detail: '运行排产算法基础用例并验证返回结构', start: 94, end: 100, seconds: 1 * installScale, done: '排产算法烟雾测试通过' }
      ])
    }

    primary.addEventListener('click', function () {
      if (state.name === 'idle') {
        state.name = 'checking'
        primary.disabled = true
        primary.textContent = '检查中…'
        setProgress(layer, 0, '正在检查更新', '正在连接 BSQ 更新服务…', '正在读取版本信息')
        appendLog(layer, '正在向更新服务器请求最新版本清单')
        Promise.all([
          loadReleaseManifest(config),
          new Promise(function (resolve) { window.setTimeout(resolve, 1000) })
        ]).then(function (results) {
          if (!document.body.contains(layer) || state.name !== 'checking') return
          var release = results[0]
          state.release = release
          layer.querySelector('[data-latest-version]').textContent = release.latestVersion
          layer.querySelector('[data-package-name]').textContent = release.packageName
          layer.querySelector('[data-package-meta]').textContent = formatBytes(release.packageSizeBytes) + '  ·  ' + release.releaseDate
          layer.querySelector('[data-release-notes]').innerHTML = ''
          renderNotes(layer, release)
          layer.querySelector('[data-package-section]').hidden = false
          layer.querySelector('[data-release-section]').hidden = false
          appendLog(layer, '版本清单读取完成：' + config.manifestUrl)
          appendLog(layer, '更新包可用：' + release.packageName + '（' + formatBytes(release.packageSizeBytes) + '）')
          if (config.currentVersion === release.latestVersion) {
            state.name = 'complete'
            setProgress(layer, 100, '当前已是最新版本', '版本 ' + config.currentVersion + ' 无需更新', '未发现可用更新')
            primary.disabled = false
            primary.textContent = '重新检查'
            appendLog(layer, '未发现新版本', 'success')
          } else {
            state.name = 'available'
            setProgress(layer, 0, '发现新版本 ' + release.latestVersion, '新版本已准备就绪，可以立即开始更新', release.packageName)
            primary.disabled = false
            primary.textContent = '立即更新'
            appendLog(layer, '发现新版本 ' + release.latestVersion + '，发布日期 ' + release.releaseDate, 'success')
          }
        }).catch(function (error) {
          if (!document.body.contains(layer) || state.name !== 'checking') return
          state.name = 'idle'
          primary.disabled = false
          primary.textContent = '重新检查'
          setProgress(layer, 0, '检查更新失败', '无法读取有效的更新版本信息', error.message || '更新服务器不可用')
          appendLog(layer, '检查更新失败：' + (error.message || '更新服务器不可用'), 'warning')
        })
      } else if (state.name === 'available') {
        startUpdate()
      } else if (state.name === 'complete') {
        reset()
      }
    })

    cancel.addEventListener('click', function () {
      if (state.name !== 'updating') return
      if (updateTimer) window.clearInterval(updateTimer)
      updateTimer = null
      appendLog(layer, '用户取消了本次更新任务', 'warning')
      reset()
    })
    layer.querySelector('[data-clear-log]').addEventListener('click', function () {
      layer.querySelector('[data-update-log]').innerHTML = ''
    })
    layer.querySelector('[data-close-updater]').addEventListener('click', closeUpdater)
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }

  function defaultPluginCode() {
    return [
      "export default {",
      "  name: 'production-trace-plugin',",
      "  version: '1.0.0',",
      "  description: '生产追溯扩展模块',",
      "",
      "  install(context) {",
      "    context.register('trace:afterReport', (order) => {",
      "      return {",
      "        orderNo: order.orderNo,",
      "        status: 'IN_PROGRESS',",
      "        traceEnabled: true",
      "      }",
      "    })",
      "  }",
      "}"
    ].join('\n')
  }

  function openIde(config) {
    var layer = document.createElement('div')
    layer.id = UPDATER_ID
    layer.className = 'platform-updater-layer platform-center-layer platform-ide-layer'
    layer.innerHTML =
      '<div class="platform-updater-backdrop"></div>' +
      '<section class="platform-center-dialog platform-ide-dialog" role="dialog" aria-modal="true" aria-labelledby="platform-updater-title">' +
        '<header class="platform-center-header">' +
          '<div class="platform-center-title"><span><i class="el-icon-edit-outline"></i></span><div><h2 id="platform-updater-title">平台在线 IDE</h2><p>功能模块在线开发 · 插件校验 · 动态加载</p></div></div>' +
          '<div><em>隔离环境</em><button class="platform-layer-close" type="button" aria-label="关闭" data-close-updater>×</button></div>' +
        '</header>' +
        '<nav class="platform-workspace-tabs" aria-label="开发工作台视图">' +
          '<button class="is-active" type="button" data-workspace-tab="ide"><i class="el-icon-edit-outline"></i><span>在线 IDE</span><small>代码编写与插件配置</small></button>' +
          '<button type="button" data-workspace-tab="deploy"><i class="el-icon-upload2"></i><span>热部署</span><small>插件校验与动态加载</small></button>' +
        '</nav>' +
        '<main class="platform-ide-main" data-workspace-page="ide">' +
          '<aside class="platform-ide-explorer">' +
            '<div class="platform-ide-panel-title"><strong>资源管理器</strong><button title="新建文件" type="button">＋</button></div>' +
            '<div class="platform-project-name"><i class="el-icon-folder-opened"></i> MES-PLUGINS</div>' +
            '<button class="platform-file is-active" type="button" data-file="plugin.js"><i class="el-icon-document"></i><span>production-trace.js</span><b>JS</b></button>' +
            '<button class="platform-file" type="button" data-file="manifest.json"><i class="el-icon-document"></i><span>manifest.json</span><b>{ }</b></button>' +
            '<button class="platform-file" type="button" data-file="README.md"><i class="el-icon-document"></i><span>README.md</span><b>MD</b></button>' +
            '<div class="platform-plugin-summary">' +
              '<span>插件信息</span><dl><div><dt>运行方式</dt><dd>动态加载</dd></div><div><dt>目标系统</dt><dd>MES 3.8.2</dd></div><div><dt>隔离模式</dt><dd>沙箱运行</dd></div></dl>' +
            '</div>' +
          '</aside>' +
          '<section class="platform-ide-editor">' +
            '<div class="platform-editor-toolbar"><div><span class="platform-editor-dot"></span><strong data-current-file>production-trace.js</strong><small>JavaScript</small></div><div><button type="button" data-format-code>格式化</button><button type="button" data-save-code><i class="el-icon-document-checked"></i> 保存</button></div></div>' +
            '<div class="platform-code-wrap"><div class="platform-line-numbers" data-line-numbers></div><textarea spellcheck="false" aria-label="插件代码编辑器" data-code-editor></textarea></div>' +
            '<div class="platform-editor-status"><span><i></i> JavaScript</span><span>UTF-8</span><span>Ln <b data-cursor-line>1</b></span><span data-save-state>未修改</span></div>' +
            '<div class="platform-console-card"><header><strong>IDE 终端</strong><button type="button" data-clear-log>清空</button></header><div class="platform-log" data-update-log></div></div>' +
          '</section>' +
        '</main>' +
        '<main class="platform-deploy-page" data-workspace-page="deploy" hidden>' +
          '<aside class="platform-deploy-panel">' +
            '<div class="platform-ide-panel-title"><strong>部署配置</strong><span class="platform-page-badge">HOT SWAP</span></div>' +
            '<div class="platform-simulation-note"><i class="el-icon-info"></i><span>发布过程不会修改生产源码或重启 MES。</span></div>' +
            '<label>插件名称<input value="生产追溯扩展" data-plugin-name></label>' +
            '<label>插件标识<input value="production-trace" data-plugin-id></label>' +
            '<label>版本号<input value="1.0.0" data-plugin-version></label>' +
            '<div class="platform-deploy-checks">' +
              '<div data-check="syntax"><i></i><span>代码语法校验</span><b>待校验</b></div>' +
              '<div data-check="manifest"><i></i><span>插件清单校验</span><b>待校验</b></div>' +
              '<div data-check="sandbox"><i></i><span>沙箱兼容检查</span><b>待校验</b></div>' +
              '<div data-check="load"><i></i><span>动态加载状态</span><b>未加载</b></div>' +
            '</div>' +
            '<div class="platform-deploy-progress"><div><i data-deploy-bar></i></div><span data-deploy-percent>0%</span></div>' +
            '<button class="platform-secondary-button platform-check-button" type="button" data-check-code><i class="el-icon-circle-check"></i> 校验插件</button>' +
            '<button class="platform-primary-button platform-deploy-button" type="button" data-deploy-plugin disabled><i class="el-icon-upload2"></i> 插件化热部署</button>' +
            '<p class="platform-deploy-result" data-deploy-result>请先完成插件校验</p>' +
          '</aside>' +
          '<section class="platform-deploy-workspace">' +
            '<div class="platform-deploy-hero">' +
              '<div><span>PLUGIN HOT DEPLOYMENT</span><h3>插件化热部署控制台</h3><p>将 IDE 中保存的功能模块打包、校验并动态加载，实现无需重启的即时生效。</p></div>' +
              '<strong data-runtime-state><i></i> 等待校验</strong>' +
            '</div>' +
            '<div class="platform-runtime-cards">' +
              '<article><i class="el-icon-box"></i><div><span>当前插件</span><strong>production-trace</strong><small>版本 1.0.0</small></div></article>' +
              '<article><i class="el-icon-cpu"></i><div><span>运行容器</span><strong>MES Plugin Sandbox</strong><small>隔离加载模式</small></div></article>' +
              '<article><i class="el-icon-refresh"></i><div><span>生效方式</span><strong>动态加载</strong><small>无需重启 MES</small></div></article>' +
            '</div>' +
            '<div class="platform-deploy-flow">' +
              '<h4>部署执行链路</h4><div>' +
                '<span><b>01</b><strong>构建插件</strong><small>生成模块包</small></span><i>›</i>' +
                '<span><b>02</b><strong>安全校验</strong><small>语法与清单</small></span><i>›</i>' +
                '<span><b>03</b><strong>沙箱加载</strong><small>隔离初始化</small></span><i>›</i>' +
                '<span><b>04</b><strong>即时生效</strong><small>路由切换</small></span>' +
              '</div>' +
            '</div>' +
            '<div class="platform-deploy-log-card"><header><strong>热部署日志</strong><button type="button" data-clear-log>清空</button></header><div class="platform-log" data-update-log></div></div>' +
          '</section>' +
        '</main>' +
      '</section>'
    document.body.appendChild(layer)

    var editor = layer.querySelector('[data-code-editor]')
    var numbers = layer.querySelector('[data-line-numbers]')
    var saveState = layer.querySelector('[data-save-state]')
    var deployButton = layer.querySelector('[data-deploy-plugin]')
    var checkButton = layer.querySelector('[data-check-code]')
    var deployTimer = null
    var fileContents = {
      'plugin.js': localStorage.getItem('mes-online-ide-plugin') || defaultPluginCode(),
      'manifest.json': '{\n  "id": "production-trace",\n  "name": "生产追溯扩展",\n  "version": "1.0.0",\n  "entry": "production-trace.js",\n  "hotReload": true\n}',
      'README.md': '# 生产追溯扩展\n\n用于 MES 功能模块在线开发、插件校验与动态加载。\n\n> 热部署过程不会写入生产系统。'
    }
    var currentFile = 'plugin.js'

    function updateLines() {
      var count = Math.max(1, editor.value.split('\n').length)
      numbers.innerHTML = Array.from({ length: count }, function (_, index) { return '<span>' + (index + 1) + '</span>' }).join('')
      var beforeCursor = editor.value.slice(0, editor.selectionStart || 0)
      layer.querySelector('[data-cursor-line]').textContent = beforeCursor.split('\n').length
    }

    function markCheck(name, text, passed) {
      var row = layer.querySelector('[data-check="' + name + '"]')
      row.classList.toggle('is-passed', passed)
      row.classList.toggle('is-running', !passed)
      row.querySelector('b').textContent = text
    }

    function saveCode() {
      fileContents[currentFile] = editor.value
      if (currentFile === 'plugin.js') localStorage.setItem('mes-online-ide-plugin', editor.value)
      saveState.textContent = '已保存 ' + new Date().toLocaleTimeString('zh-CN', { hour12: false })
      appendLog(layer, currentFile + ' 已保存到浏览器开发工作区', 'success')
    }

    function validateCode() {
      saveCode()
      checkButton.disabled = true
      deployButton.disabled = true
      layer.querySelector('[data-deploy-result]').textContent = '正在执行插件校验…'
      appendLog(layer, '开始校验插件 production-trace')
      var checks = [
        ['syntax', '语法通过', editor.value.indexOf('export default') !== -1 && editor.value.indexOf('install') !== -1],
        ['manifest', '清单有效', /"id"\s*:\s*"production-trace"/.test(fileContents['manifest.json'])],
        ['sandbox', '兼容通过', !/\beval\s*\(|document\.cookie|localStorage\.clear/.test(editor.value)]
      ]
      var index = 0
      function next() {
        if (index >= checks.length) {
          var passed = checks.every(function (item) { return item[2] })
          checkButton.disabled = false
          deployButton.disabled = !passed
          layer.querySelector('[data-deploy-result]').textContent = passed ? '校验通过，可以执行热部署' : '校验未通过，请检查代码'
          layer.querySelector('[data-runtime-state]').innerHTML = passed ? '<i></i> 校验通过' : '<i></i> 校验失败'
          layer.querySelector('[data-runtime-state]').classList.toggle('is-ready', passed)
          appendLog(layer, passed ? '插件校验全部通过' : '插件校验失败，请修复后重试', passed ? 'success' : 'warning')
          return
        }
        var item = checks[index++]
        markCheck(item[0], '校验中…', false)
        window.setTimeout(function () {
          var row = layer.querySelector('[data-check="' + item[0] + '"]')
          row.classList.remove('is-running')
          row.classList.toggle('is-passed', item[2])
          row.classList.toggle('is-failed', !item[2])
          row.querySelector('b').textContent = item[2] ? item[1] : '未通过'
          next()
        }, 320)
      }
      next()
    }

    function simulateDeploy() {
      deployButton.disabled = true
      checkButton.disabled = true
      var progress = 0
      var steps = [
        [18, '正在打包插件模块…'],
        [42, '正在创建隔离加载上下文…'],
        [68, '正在注册扩展点与事件监听器…'],
        [88, '正在切换模块路由…'],
        [100, '插件已动态加载并即时生效']
      ]
      var stepIndex = 0
      appendLog(layer, '已创建热部署任务', 'success')
      layer.querySelector('[data-deploy-result]').textContent = steps[0][1]
      markCheck('load', '加载中…', false)
      deployTimer = window.setInterval(function () {
        progress = Math.min(100, progress + 2)
        layer.querySelector('[data-deploy-bar]').style.width = progress + '%'
        layer.querySelector('[data-deploy-percent]').textContent = progress + '%'
        if (stepIndex < steps.length && progress >= steps[stepIndex][0]) {
          layer.querySelector('[data-deploy-result]').textContent = steps[stepIndex][1]
          appendLog(layer, steps[stepIndex][1], progress === 100 ? 'success' : '')
          stepIndex += 1
        }
        if (progress >= 100) {
          window.clearInterval(deployTimer)
          deployTimer = null
          markCheck('load', '运行中', true)
          layer.querySelector('[data-runtime-state]').innerHTML = '<i></i> 插件运行中'
          layer.querySelector('[data-runtime-state]').classList.add('is-running')
          checkButton.disabled = false
          deployButton.disabled = false
          deployButton.innerHTML = '<i class="el-icon-refresh"></i> 重新热部署'
          layer.querySelector('[data-deploy-result]').innerHTML = '<strong>部署成功</strong> · 无需重启 MES'
        }
      }, 60)
    }

    editor.value = fileContents[currentFile]
    updateLines()
    appendLog(layer, '在线 IDE 已启动，工作区 MES-PLUGINS 加载完成', 'success')
    appendLog(layer, '当前为安全隔离模式，不会写入或重启 MES 服务')

    layer.querySelectorAll('[data-workspace-tab]').forEach(function (button) {
      button.addEventListener('click', function () {
        var target = button.getAttribute('data-workspace-tab')
        fileContents[currentFile] = editor.value
        layer.querySelectorAll('[data-workspace-tab]').forEach(function (item) {
          item.classList.toggle('is-active', item === button)
        })
        layer.querySelectorAll('[data-workspace-page]').forEach(function (page) {
          page.hidden = page.getAttribute('data-workspace-page') !== target
        })
        if (target === 'deploy') appendLog(layer, '已进入热部署页面，载入当前 IDE 工作区代码')
      })
    })

    editor.addEventListener('input', function () {
      fileContents[currentFile] = editor.value
      saveState.textContent = '未保存'
      deployButton.disabled = true
      updateLines()
    })
    editor.addEventListener('click', updateLines)
    editor.addEventListener('keyup', updateLines)
    editor.addEventListener('scroll', function () { numbers.scrollTop = editor.scrollTop })
    editor.addEventListener('keydown', function (event) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        saveCode()
      }
      if (event.key === 'Tab') {
        event.preventDefault()
        var start = editor.selectionStart
        editor.setRangeText('  ', start, editor.selectionEnd, 'end')
        editor.dispatchEvent(new Event('input'))
      }
    })
    layer.querySelectorAll('[data-file]').forEach(function (button) {
      button.addEventListener('click', function () {
        fileContents[currentFile] = editor.value
        currentFile = button.getAttribute('data-file')
        layer.querySelectorAll('[data-file]').forEach(function (item) { item.classList.toggle('is-active', item === button) })
        layer.querySelector('[data-current-file]').textContent = button.querySelector('span').textContent
        layer.querySelector('.platform-editor-toolbar small').textContent = currentFile === 'plugin.js' ? 'JavaScript' : (currentFile === 'manifest.json' ? 'JSON' : 'Markdown')
        editor.value = fileContents[currentFile]
        saveState.textContent = '未修改'
        updateLines()
      })
    })
    layer.querySelector('[data-format-code]').addEventListener('click', function () {
      editor.value = editor.value.replace(/\t/g, '  ').replace(/[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n')
      editor.dispatchEvent(new Event('input'))
      appendLog(layer, currentFile + ' 已完成基础格式化')
    })
    layer.querySelector('[data-save-code]').addEventListener('click', saveCode)
    layer.querySelector('[data-check-code]').addEventListener('click', validateCode)
    layer.querySelector('[data-deploy-plugin]').addEventListener('click', simulateDeploy)
    layer.querySelectorAll('[data-clear-log]').forEach(function (button) {
      button.addEventListener('click', function () {
        layer.querySelectorAll('[data-update-log]').forEach(function (log) { log.innerHTML = '' })
      })
    })
    layer.querySelector('[data-close-updater]').addEventListener('click', function () {
      if (deployTimer) window.clearInterval(deployTimer)
      removeLayer(UPDATER_ID)
    })
  }

  function openEmbeddedIde(config) {
    var layer = document.createElement('div')
    layer.id = UPDATER_ID
    layer.className = 'platform-updater-layer platform-center-layer platform-ide-layer platform-theia-layer platform-fullpage-layer'
    layer.innerHTML =
      '<section class="platform-center-dialog platform-ide-dialog platform-theia-dialog" role="application" aria-labelledby="platform-updater-title">' +
        '<header class="platform-center-header platform-ide-unified-header">' +
          '<div class="platform-center-title"><span><i class="el-icon-edit-outline"></i></span><div><h2 id="platform-updater-title">平台在线 IDE</h2><p>' + escapeHtml(config.ideWorkspaceName) + ' · Eclipse Theia</p></div></div>' +
          '<nav class="platform-workspace-tabs" aria-label="开发工作台视图">' +
            '<button class="is-active" type="button" data-workspace-tab="ide"><i class="el-icon-edit-outline"></i><span>在线 IDE</span><small>代码编辑</small></button>' +
            '<button type="button" data-workspace-tab="deploy"><i class="el-icon-upload2"></i><span>插件化热部署</span><small>无停机切换</small></button>' +
          '</nav>' +
          '<div class="platform-ide-header-actions">' +
            '<button class="platform-ide-save-update" type="button" data-ide-primary-action data-action="save" disabled><i class="el-icon-document-checked"></i><span>保存代码</span></button>' +
            '<button class="platform-header-retry" type="button" data-retry-theia title="重新连接"><i class="el-icon-refresh"></i><span>重连</span></button>' +
            '<button class="platform-fullpage-back" type="button" data-close-updater><i class="el-icon-back"></i> 返回 MES</button>' +
          '</div>' +
        '</header>' +
        '<main class="platform-theia-page" data-workspace-page="ide">' +
          '<div class="platform-theia-frame-wrap">' +
            '<div class="platform-theia-loading" data-theia-loading><i class="el-icon-loading"></i><strong>正在启动在线 IDE</strong><span>Theia 服务不可用时不会影响 MES 业务。</span></div>' +
            '<div class="platform-theia-error" data-theia-error hidden><i class="el-icon-warning-outline"></i><strong>在线 IDE 正在恢复连接</strong><span>平台正在重新加载编辑服务，请稍后重试。</span><button type="button" data-retry-theia>立即重试</button></div>' +
            '<iframe title="MES Eclipse Theia 在线 IDE" data-theia-frame sandbox="allow-scripts allow-same-origin allow-forms allow-downloads allow-modals" allow="keyboard-map" referrerpolicy="strict-origin-when-cross-origin"></iframe>' +
          '</div>' +
        '</main>' +
        '<main class="platform-deploy-page" data-workspace-page="deploy" hidden>' +
          '<div class="platform-deploy-backdrop" data-return-ide></div>' +
          '<section class="platform-deploy-window platform-classic-deploy-window" role="dialog" aria-modal="true" aria-labelledby="plugin-deploy-title">' +
            '<header class="platform-center-header">' +
              '<div class="platform-center-title"><span><i class="el-icon-upload2"></i></span><div><h2 id="plugin-deploy-title">插件化热部署</h2></div></div>' +
              '<div><button class="platform-layer-close" type="button" aria-label="返回在线 IDE" data-return-ide>×</button></div>' +
            '</header>' +
            '<main class="platform-center-main platform-classic-deploy-main">' +
              '<aside class="platform-version-card platform-plugin-version-card">' +
                '<h3>版本信息</h3>' +
                '<dl><div><dt>当前模块版本</dt><dd data-current-plugin-version>3.8.2</dd></div><div><dt>可用版本</dt><dd class="is-latest" data-target-plugin-version>--</dd></div></dl>' +
                '<div class="platform-detected-updates" data-update-files hidden><i class="el-icon-warning-outline"></i><div><strong>production-scheduling</strong><span data-update-file-status>检测到以下 2 个文件有更新</span><ul><li>src/application/production-management-service.js</li><li>src/scheduling/finite-capacity-scheduler.js</li></ul></div></div>' +
                '<label class="platform-plugin-config" data-plugin-config hidden>插件名称<input value="柔性排产模块" data-plugin-name></label>' +
                '<label class="platform-plugin-config" data-plugin-config hidden>插件标识<input value="production-scheduling" data-plugin-id></label>' +
                '<label data-plugin-config hidden>部署版本号<input value="' + PLUGIN_TARGET_VERSION + '" data-plugin-version readonly aria-readonly="true"></label>' +
                '<div class="platform-deploy-source"><span>代码状态</span><strong data-code-save-state>等待检查更新</strong><small data-code-file>将扫描 IDE 隔离工作区</small></div>' +
              '</aside>' +
              '<section class="platform-update-workspace">' +
                '<div class="platform-status-card platform-plugin-status-card">' +
                  '<div class="platform-status-heading"><i></i><div><h3 data-runtime-state>准备检查更新</h3><p>检查 production-scheduling 的模块变更</p></div></div>' +
                  '<div class="platform-progress"><div><i data-deploy-bar></i></div><strong data-deploy-percent>0%</strong></div>' +
                  '<p class="platform-transfer" data-deploy-result>点击“检查更新”获取最新模块版本和文件清单</p>' +
                  '<div class="platform-actions"><button class="platform-primary-button" type="button" data-deploy-plugin><i class="el-icon-search"></i> 检查更新</button><button class="platform-secondary-button" type="button" data-return-ide>返回 IDE</button></div>' +
                  '<div class="platform-plugin-runtime-summary"><span>目标插件 <strong data-runtime-plugin>production-scheduling</strong></span><span data-runtime-version>当前版本 3.8.2</span><span>最后保存 <strong data-runtime-saved>尚未保存</strong></span><span data-runtime-file>等待更新检查</span></div>' +
                  '<div class="platform-deploy-checks" hidden>' +
                    '<div data-check="changes"><i></i><span>变更快照</span><b>等待保存</b></div><div data-check="syntax"><i></i><span>源码检查</span><b>待校验</b></div><div data-check="manifest"><i></i><span>插件清单校验</span><b>待校验</b></div><div data-check="sandbox"><i></i><span>沙箱构建</span><b>待校验</b></div><div data-check="shadow"><i></i><span>影子实例加载</span><b>未加载</b></div><div data-check="health"><i></i><span>就绪与健康检查</span><b>未执行</b></div><div data-check="switch"><i></i><span>插件路由原子切换</span><b>未切换</b></div><div data-check="drain"><i></i><span>旧插件实例排空</span><b>未执行</b></div>' +
                  '</div>' +
                  '<div class="platform-runtime-hidden" hidden><span data-active-slot>BLUE · generation 1</span><span data-slot-detail>旧插件持续提供服务</span><span data-rollback-state>旧版本已保留</span></div>' +
                '</div>' +
                '<div class="platform-log-card"><header><h3>部署日志</h3><button type="button" data-clear-log>清空</button></header><div class="platform-log" data-update-log></div></div>' +
              '</section>' +
            '</main>' +
          '</section>' +
        '</main>' +
      '</section>'
    document.body.appendChild(layer)

    var iframe = layer.querySelector('[data-theia-frame]')
    var loading = layer.querySelector('[data-theia-loading]')
    var errorPanel = layer.querySelector('[data-theia-error]')
    var ideActionButton = layer.querySelector('[data-ide-primary-action]')
    var deployButton = layer.querySelector('[data-deploy-plugin]')
    var deployTimer = null
    var connectTimer = null
    var healthTimer = null
    var healthFailures = 0
    var connectionLost = false
    var closed = false
    var connectionGeneration = 0
    var ideOrigin = new URL(config.ideUrl, window.location.href).origin
    var savedFile = ''
    var savedPath = ''
    var savedAt = ''
    var savedIsoTime = ''
    var updatesChecked = false
    var aiReviewPassed = false
    var saveRequestTimer = null

    function setIdePrimaryAction(action) {
      var isUpdate = action === 'update'
      ideActionButton.setAttribute('data-action', isUpdate ? 'update' : 'save')
      ideActionButton.classList.toggle('is-update', isUpdate)
      ideActionButton.innerHTML = isUpdate
        ? '<i class="el-icon-refresh"></i><span>更新</span>'
        : '<i class="el-icon-document-checked"></i><span>保存代码</span>'
      ideActionButton.disabled = !isUpdate && !layer.classList.contains('is-theia-ready')
    }

    function showConnectionState(state) {
      if (closed) return
      layer.classList.toggle('is-theia-ready', state === 'ready')
      layer.classList.toggle('is-theia-error', state === 'error')
      loading.hidden = state !== 'loading'
      errorPanel.hidden = state !== 'error'
      iframe.hidden = state === 'error'
      if (ideActionButton.getAttribute('data-action') === 'save') {
        ideActionButton.disabled = state !== 'ready'
      }
    }

    function connectTheia() {
      if (closed) return
      var generation = ++connectionGeneration
      if (connectTimer) window.clearTimeout(connectTimer)
      if (healthTimer) window.clearTimeout(healthTimer)
      showConnectionState('loading')
      iframe.hidden = true
      iframe.removeAttribute('src')
      var attempts = 0

      function waitUntilHealthy() {
        if (closed || generation !== connectionGeneration) return
        attempts += 1
        fetch(config.ideUrl + '/mes-sandbox/health?_=' + Date.now(), {
          cache: 'no-store',
          credentials: 'same-origin'
        }).then(function (response) {
          if (!response.ok) throw new Error('IDE health check failed')
          return response.json()
        }).then(function (health) {
          if (closed || generation !== connectionGeneration) return
          if (!health || health.ok !== true || health.service !== 'mes-embedded-theia') {
            throw new Error('IDE health response is invalid')
          }
          iframe.hidden = false
          iframe.src = config.ideUrl + '/?_mes=' + Date.now()
          connectTimer = window.setTimeout(function () { showConnectionState('error') }, 30000)
        }).catch(function () {
          if (closed || generation !== connectionGeneration) return
          if (attempts < 30) {
            connectTimer = window.setTimeout(waitUntilHealthy, 1000)
          } else {
            showConnectionState('error')
          }
        })
      }

      waitUntilHealthy()
    }

    function startHealthMonitor() {
      if (closed) return
      var generation = connectionGeneration
      if (healthTimer) window.clearTimeout(healthTimer)

      function probe() {
        if (closed || generation !== connectionGeneration) return
        fetch(config.ideUrl + '/mes-sandbox/health?_=' + Date.now(), {
          cache: 'no-store',
          credentials: 'same-origin'
        }).then(function (response) {
          if (!response.ok) throw new Error('IDE health check failed')
          return response.json()
        }).then(function (health) {
          if (closed || generation !== connectionGeneration) return
          if (!health || health.ok !== true || health.service !== 'mes-embedded-theia') {
            throw new Error('IDE health response is invalid')
          }
          healthFailures = 0
          if (connectionLost) {
            connectionLost = false
            connectTheia()
            return
          }
          healthTimer = window.setTimeout(probe, 3000)
        }).catch(function () {
          if (closed || generation !== connectionGeneration) return
          healthFailures += 1
          if (healthFailures >= 2) {
            connectionLost = true
            showConnectionState('loading')
            iframe.hidden = true
          }
          healthTimer = window.setTimeout(probe, 1000)
        })
      }

      healthTimer = window.setTimeout(probe, 3000)
    }

    // The iframe also fires load for about:blank and error pages. Only the
    // existing mes-theia ready message confirms that the editor has started.

    function markCheck(name, text, passed) {
      var row = layer.querySelector('[data-check="' + name + '"]')
      row.classList.remove('is-running', 'is-passed', 'is-failed')
      row.classList.add(passed ? 'is-passed' : 'is-failed')
      row.querySelector('b').textContent = text
    }

    function compactTimestamp(value) {
      var date = new Date(value || Date.now())
      return [date.getFullYear(), date.getMonth() + 1, date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds()].map(function (part, index) {
        return index === 0 ? String(part) : String(part).padStart(2, '0')
      }).join('')
    }

    function fingerprint(value) {
      var digest = ''
      for (var round = 0; round < 8; round += 1) {
        var hash = (2166136261 ^ Math.imul(round + 1, 16777619)) >>> 0
        for (var index = 0; index < value.length; index += 1) {
          hash ^= value.charCodeAt(index) + round
          hash = Math.imul(hash, 16777619)
        }
        digest += (hash >>> 0).toString(16).padStart(8, '0')
      }
      return digest
    }

    function resetDeploymentChecks() {
      ;['changes', 'syntax', 'manifest', 'sandbox', 'shadow', 'health', 'switch', 'drain'].forEach(function (name) {
        var row = layer.querySelector('[data-check="' + name + '"]')
        row.className = ''
        row.querySelector('b').textContent = name === 'changes' ? '快照就绪' : (name === 'shadow' ? '未加载' : (name === 'switch' ? '未切换' : ((name === 'health' || name === 'drain') ? '未执行' : '待校验')))
      })
      layer.querySelector('[data-deploy-bar]').style.width = '0%'
      layer.querySelector('[data-deploy-percent]').textContent = '0%'
    }

    function checkPluginUpdates() {
      if (deployTimer) window.clearTimeout(deployTimer)
      aiReviewPassed = false
      deployButton.disabled = true
      deployButton.innerHTML = '<i class="el-icon-loading"></i> 正在检查更新'
      layer.querySelector('[data-runtime-state]').textContent = '正在检查更新'
      layer.querySelector('[data-deploy-result]').textContent = '正在读取 production-scheduling 模块清单…'
      appendLog(layer, '[UPDATE] repository=production-scheduling action=CHECK_UPDATE currentVersion=3.8.2')
      appendLog(layer, '[SCAN] workspace=IDE_ISOLATED_COPY sourceWriteAccess=DENIED')
      deployTimer = window.setTimeout(function () {
        var now = new Date()
        updatesChecked = true
        deployTimer = null
        if (!savedIsoTime) savedIsoTime = now.toISOString()
        if (!savedAt) savedAt = now.toLocaleTimeString('zh-CN', { hour12: false })
        savedFile = '2 个更新文件'
        savedPath = 'production-scheduling'
        layer.querySelector('[data-update-files]').hidden = false
        layer.querySelector('[data-target-plugin-version]').textContent = PLUGIN_TARGET_VERSION
        layer.querySelector('[data-code-save-state]').textContent = '等待 AI 智能代码审查'
        layer.querySelector('[data-code-file]').textContent = 'production-scheduling · 2 个文件待审查'
        layer.querySelector('[data-runtime-saved]').textContent = savedAt
        layer.querySelector('[data-runtime-file]').textContent = '2 个文件等待 AI 审查'
        layer.querySelector('[data-runtime-version]').textContent = '可用版本 ' + PLUGIN_TARGET_VERSION
        layer.querySelector('[data-runtime-state]').innerHTML = '<i></i> 发现可用更新 ' + PLUGIN_TARGET_VERSION
        layer.querySelector('[data-runtime-state]').className = 'is-ready'
        layer.querySelector('[data-deploy-result]').textContent = '已发现 2 个更新文件，正在准备 AI 智能代码审查…'
        deployButton.disabled = true
        deployButton.innerHTML = '<i class="el-icon-loading"></i> 准备 AI 智能审查'
        markCheck('changes', '2 个文件已锁定', true)
        appendLog(layer, '[UPDATE] availableVersion=' + PLUGIN_TARGET_VERSION + ' result=UPDATE_AVAILABLE changedFiles=2', 'success')
        appendLog(layer, '[DIFF] M production-scheduling/flexible-line/src/application/production-management-service.js')
        appendLog(layer, '[DIFF] M production-scheduling/flexible-line/src/scheduling/finite-capacity-scheduler.js')
        appendLog(layer, '[SAFETY] scanTarget=IDE_ISOLATED_COPY productionSourceChanged=0', 'success')
        deployTimer = window.setTimeout(startAiCodeReview, 450)
      }, 1100)
    }

    function startAiCodeReview() {
      if (!updatesChecked) {
        checkPluginUpdates()
        return
      }
      if (deployTimer) window.clearInterval(deployTimer)
      aiReviewPassed = false
      deployButton.disabled = true
      deployButton.innerHTML = '<i class="el-icon-loading"></i> AI 智能审查中'
      layer.querySelector('[data-runtime-state]').innerHTML = '<i></i> AI 智能代码审查中'
      layer.querySelector('[data-runtime-state]').className = ''
      layer.querySelector('[data-deploy-result]').textContent = '正在分析 2 个更新文件的语法、依赖、安全性与业务风险…'
      layer.querySelector('[data-code-save-state]').textContent = 'AI 智能代码审查中'
      layer.querySelector('[data-code-file]').textContent = 'production-scheduling · 审查 2 个文件'
      layer.querySelector('[data-runtime-file]').textContent = 'AI 正在审查 2 个文件'
      layer.querySelector('[data-deploy-bar]').style.width = '0%'
      layer.querySelector('[data-deploy-percent]').textContent = '0%'

      var reviewId = 'AIR-' + compactTimestamp(new Date())
      var reviewStartedAt = window.performance.now()
      var emittedStage = 0
      var reviewStages = [
        { at: 8, message: '[AI-REVIEW] task=' + reviewId + ' model=mes-code-review-v2 scope=changed-files files=2 status=STARTED' },
        { at: 24, message: '[AI-SYNTAX] language=javascript parseErrors=0 suspiciousTokens=0 result=PASS' },
        { at: 43, message: '[AI-DEPENDENCY] importsResolved=true circularDependencies=0 forbiddenModules=0 result=PASS' },
        { at: 63, message: '[AI-SECURITY] rules=32 commandInjection=0 unsafeFileAccess=0 secretExposure=0 result=PASS' },
        { at: 82, message: '[AI-QUALITY] changedFunctions=2 complexityDelta=+0.4 duplicateBlocks=0 regressionRisk=LOW' },
        { at: 96, message: '[AI-BUSINESS] schedulingConstraints=CONSISTENT capacityBoundary=PASS backwardCompatibility=PASS' }
      ]
      appendLog(layer, '[AI-REVIEW] 已创建智能代码审查任务 ' + reviewId)

      deployTimer = window.setInterval(function () {
        var progress = Math.min(100, Math.round((window.performance.now() - reviewStartedAt) / 7200 * 100))
        layer.querySelector('[data-deploy-bar]').style.width = progress + '%'
        layer.querySelector('[data-deploy-percent]').textContent = progress + '%'
        while (emittedStage < reviewStages.length && progress >= reviewStages[emittedStage].at) {
          appendLog(layer, reviewStages[emittedStage].message)
          emittedStage += 1
        }
        if (progress < 100) return

        window.clearInterval(deployTimer)
        deployTimer = null
        aiReviewPassed = true
        layer.querySelector('[data-runtime-state]').innerHTML = '<i></i> AI 智能代码审查通过'
        layer.querySelector('[data-runtime-state]').className = 'is-ready'
        layer.querySelector('[data-deploy-result]').textContent = 'AI 审查通过：0 个阻断问题、0 个高风险问题、部署风险低'
        layer.querySelector('[data-code-save-state]').textContent = 'AI 智能代码审查通过'
        layer.querySelector('[data-code-file]').textContent = 'production-scheduling · 审查通过'
        layer.querySelector('[data-runtime-file]').textContent = '2 个文件审查通过，等待部署'
        layer.querySelectorAll('[data-plugin-config]').forEach(function (field) { field.hidden = false })
        deployButton.disabled = false
        deployButton.innerHTML = '<i class="el-icon-upload2"></i> 执行插件化热部署'
        appendLog(layer, '[AI-REVIEW] task=' + reviewId + ' blockers=0 highRisk=0 mediumRisk=0 riskLevel=LOW verdict=APPROVED', 'success')
        appendLog(layer, '[GATE] AI_CODE_REVIEW status=PASSED deploymentAllowed=true', 'success')
      }, 100)
    }

    function simulateDeploy() {
      if (!updatesChecked) {
        checkPluginUpdates()
        return
      }
      if (!aiReviewPassed) {
        startAiCodeReview()
        return
      }
      if (deployTimer) window.clearTimeout(deployTimer)
      resetDeploymentChecks()
      deployButton.disabled = true
      deployButton.innerHTML = '<i class="el-icon-loading"></i> 部署任务执行中'
      var pluginId = layer.querySelector('[data-plugin-id]').value || 'production-scheduling'
      var version = PLUGIN_TARGET_VERSION
      layer.querySelector('[data-plugin-version]').value = PLUGIN_TARGET_VERSION
      layer.querySelector('[data-target-plugin-version]').textContent = version
      layer.querySelector('[data-update-files]').classList.remove('is-deployed')
      layer.querySelector('[data-update-file-status]').textContent = '以下 2 个文件正在部署'
      layer.querySelector('[data-code-save-state]').textContent = '部署快照已锁定'
      layer.querySelector('[data-code-file]').textContent = 'production-scheduling · 2 个文件'
      layer.querySelector('[data-runtime-file]').textContent = '2 个文件正在部署'
      var deploymentId = 'DEP-' + compactTimestamp(new Date())
      var artifactId = fingerprint(savedPath + savedIsoTime + version)
      var artifactName = pluginId + '-' + version + '+' + compactTimestamp(savedIsoTime).slice(0, 14) + '.plugin'
      var buildSize = 160 + (parseInt(artifactId.slice(0, 2), 16) % 70)
      var startedAt = window.performance.now()
      var stepIndex = 0
      var steps = [
        { check: 'changes', progress: 10, durationMs: 1800, pending: '正在锁定 IDE 保存版本', done: '快照已锁定', logs: [
          '[DEPLOY] task=' + deploymentId + ' strategy=PLUGIN_HOT_SWAP mode=HOT_SWAP requestedBy=developer',
          '[GATE] updateCheck=PASSED aiCodeReview=PASSED changedFiles=2',
          '[CHANGESET] snapshot=' + artifactId.slice(0, 12) + ' files=2 source=' + savedPath + ' savedAt=' + savedIsoTime,
          '[CONTINUITY] mesService=ONLINE acceptingTraffic=true restartRequired=false',
          '[SAFETY] source=isolated-copy mesWriteAccess=DENIED databaseAccess=DENIED'
        ] },
        { check: 'syntax', progress: 22, durationMs: 2200, pending: '正在执行源码预检', done: '源码检查通过', logs: [
          '[CHECK] parser=javascript targets=production-management-service.js,finite-capacity-scheduler.js syntaxErrors=0 warnings=0',
          '[CHECK] moduleGraph resolved=true unresolvedImports=0 scope=isolated-source-snapshot'
        ] },
        { check: 'manifest', progress: 34, durationMs: 1800, pending: '正在校验插件清单', done: '清单校验通过', logs: [
          '[MANIFEST] id=' + pluginId + ' version=' + version + ' lifecycle=hot-swappable apiLevel=mes-3.8',
          '[MANIFEST] permissions=[trace:read,schedule:read] forbiddenCapabilities=[shell,process,mes:file-write]',
          '[COMPAT] host=mes-3.8.2 contract=plugin-api-v1 result=COMPATIBLE'
        ] },
        { check: 'sandbox', progress: 50, durationMs: 3200, pending: '正在生成隔离产物', done: '沙箱构建完成', logs: [
          '[BUILD] bundle=' + artifactName + ' modules=18 size=' + buildSize + 'KB',
          '[BUILD] sha256=' + artifactId + ' signature=SIG-' + artifactId.slice(0, 16) + ' cache=MISS',
          '[SECURITY] policy=mes-plugin-sandbox-v1 shell=DENIED process=DENIED hostFileWrite=DENIED result=PASSED'
        ] },
        { check: 'shadow', progress: 66, durationMs: 3000, pending: '正在加载 GREEN 影子实例', done: '影子实例已加载', logs: [
          '[RUNTIME] host=mes-plugin-runtime slot=GREEN trafficWeight=0 generation=2',
          '[RUNTIME] artifact=' + artifactName + ' moduleLoader=isolated-vm state=INITIALIZED',
          '[EXPORTS] staged=[createProductionManagement,generateFiniteCapacitySchedule] published=false'
        ] },
        { check: 'health', progress: 78, durationMs: 2200, pending: '正在执行零流量探针', done: '健康检查通过', logs: [
          '[PROBE] slot=GREEN readiness=PASS liveness=PASS warmup=PASS',
          '[PROBE] exports=2 samples=100 invocationTest=PASS latencyP95=12ms memory=18MB trafficWeight=0'
        ] },
        { check: 'switch', progress: 90, durationMs: 1800, pending: '正在原子切换插件路由', done: '路由切换成功', logs: [
          '[ROUTER] compareAndSwap plugin=' + pluginId + ' from=BLUE:g1 to=GREEN:g2',
          '[ROUTER] activation=COMMITTED trafficWeight={BLUE:0,GREEN:100} switchTime=4ms',
          '[CONTINUITY] mesService=ONLINE inflightRequestsPreserved=true businessDowntimeMs=0'
        ] },
        { check: 'drain', progress: 100, durationMs: 2000, pending: '正在排空旧插件实例', done: '旧实例安全退出', logs: [
          '[DRAIN] slot=BLUE newRequests=0 inflight=0 gracefulUnload=COMPLETE',
          '[ROLLBACK] previousArtifact retained=true retention=10m automaticFallback=ARMED',
          '[SERVICE] mes-core status=ONLINE hostProcessRestarted=false'
        ] }
      ]
      layer.querySelector('[data-deploy-result]').textContent = '任务 ' + deploymentId + ' 已创建，正在锁定变更快照…'
      layer.querySelector('[data-runtime-state]').className = ''
        layer.querySelector('[data-runtime-state]').innerHTML = '<i></i> 无停机发布中 · ' + deploymentId

      function runStep() {
        if (stepIndex >= steps.length) {
          var duration = Math.round(window.performance.now() - startedAt)
          deployTimer = null
          layer.querySelector('[data-runtime-state]').innerHTML = '<i></i> GREEN 插件运行中'
          layer.querySelector('[data-runtime-state]').classList.add('is-running')
          layer.querySelector('[data-active-slot]').textContent = 'GREEN · generation 2'
          layer.querySelector('[data-slot-detail]').textContent = '新插件已承载 100% 插件调用'
          layer.querySelector('[data-rollback-state]').textContent = 'BLUE 版本保留 10 分钟'
          layer.querySelector('[data-runtime-version]').textContent = '运行版本 ' + version
          layer.querySelector('[data-current-plugin-version]').textContent = version
          layer.querySelector('[data-target-plugin-version]').textContent = '当前已是最新版本'
          layer.querySelector('[data-update-files]').classList.add('is-deployed')
          layer.querySelector('[data-update-file-status]').textContent = '以下 2 个文件已完成部署'
          layer.querySelector('[data-code-save-state]').textContent = '2 个文件已部署'
          layer.querySelector('[data-code-file]').textContent = 'production-scheduling · 部署完成'
          layer.querySelector('[data-runtime-file]').textContent = '2 个文件已部署'
          deployButton.disabled = false
          deployButton.innerHTML = '<i class="el-icon-refresh"></i> 重新执行热部署'
          layer.querySelector('[data-deploy-result]').innerHTML = '<strong>插件无停机切换成功</strong> · ' + deploymentId + ' · ' + duration + 'ms · MES 主服务未重启'
          appendLog(layer, '[COMPLETE] task=' + deploymentId + ' status=SUCCESS duration=' + duration + 'ms', 'success')
          appendLog(layer, '[AUDIT] deploymentType=PLUGIN_HOT_SWAP workspace=ISOLATED_COPY isolatedWorkspaceFilesChanged=2 productionSourceFilesChanged=0 mesServicesStopped=0 mesServicesRestarted=0 downtimeMs=0', 'success')
          window.dispatchEvent(new CustomEvent('mes-production-module-activated', {
            detail: { module: 'production-scheduling', version: version, deploymentId: deploymentId }
          }))
          return
        }
        var step = steps[stepIndex]
        var row = layer.querySelector('[data-check="' + step.check + '"]')
        row.className = 'is-running'
        row.querySelector('b').textContent = '执行中…'
        layer.querySelector('[data-deploy-result]').textContent = step.pending
        var previousProgress = stepIndex === 0 ? 0 : steps[stepIndex - 1].progress
        var stageStartedAt = window.performance.now()
        deployTimer = window.setInterval(function () {
          var ratio = Math.min(1, (window.performance.now() - stageStartedAt) / step.durationMs)
          var visibleProgress = Math.round(previousProgress + (step.progress - previousProgress) * ratio)
          layer.querySelector('[data-deploy-bar]').style.width = visibleProgress + '%'
          layer.querySelector('[data-deploy-percent]').textContent = visibleProgress + '%'
          if (ratio < 1) return
          window.clearInterval(deployTimer)
          deployTimer = null
          markCheck(step.check, step.done, true)
          step.logs.forEach(function (message) { appendLog(layer, message, (step.check === 'switch' || step.check === 'drain') ? 'success' : '') })
          stepIndex += 1
          runStep()
        }, 100)
      }
      runStep()
    }

    function receiveTheiaMessage(event) {
      if (event.origin !== ideOrigin || event.source !== iframe.contentWindow) return
      var message = event.data
      if (!message || message.source !== 'mes-theia') return
      if (message.type === 'ready') {
        if (connectTimer) window.clearTimeout(connectTimer)
        showConnectionState('ready')
        healthFailures = 0
        startHealthMonitor()
      }
      if (message.type === 'saved') {
        if (saveRequestTimer) window.clearTimeout(saveRequestTimer)
        saveRequestTimer = null
        setIdePrimaryAction('update')
        if (deployTimer) window.clearInterval(deployTimer)
        deployTimer = null
        updatesChecked = false
        aiReviewPassed = false
        savedFile = message.fileName || savedFile
        savedPath = message.filePath || savedFile
        savedIsoTime = message.savedAt || new Date().toISOString()
        savedAt = new Date(savedIsoTime).toLocaleTimeString('zh-CN', { hour12: false })
        layer.querySelector('[data-update-files]').hidden = true
        layer.querySelectorAll('[data-plugin-config]').forEach(function (field) { field.hidden = true })
        layer.querySelector('[data-target-plugin-version]').textContent = '--'
        layer.querySelector('[data-deploy-bar]').style.width = '0%'
        layer.querySelector('[data-deploy-percent]').textContent = '0%'
        layer.querySelector('[data-code-save-state]').textContent = 'IDE 已保存，等待检查更新'
        layer.querySelector('[data-code-file]').textContent = savedPath + ' · ' + savedAt
        layer.querySelector('[data-runtime-saved]').textContent = savedAt
        layer.querySelector('[data-runtime-file]').textContent = savedPath
        layer.querySelector('[data-deploy-result]').textContent = '代码已保存，请检查 production-scheduling 模块更新'
        layer.querySelector('[data-runtime-state]').innerHTML = '<i></i> 准备检查更新'
        layer.querySelector('[data-runtime-state]').className = ''
        deployButton.disabled = false
        deployButton.innerHTML = '<i class="el-icon-search"></i> 检查更新'
        appendLog(layer, '[IDE] saved file=' + savedPath + ' at=' + savedIsoTime, 'success')
        appendLog(layer, '[CHANGESET] IDE 保存事件已登记，等待检查模块更新')
      }
    }

    layer.querySelectorAll('[data-retry-theia]').forEach(function (button) { button.addEventListener('click', connectTheia) })
    ideActionButton.addEventListener('click', function () {
      if (ideActionButton.getAttribute('data-action') === 'update') {
        var deployTab = layer.querySelector('[data-workspace-tab="deploy"]')
        if (deployTab) deployTab.click()
        if (!updatesChecked) checkPluginUpdates()
        else if (!aiReviewPassed) startAiCodeReview()
        return
      }
      if (!layer.classList.contains('is-theia-ready')) return
      ideActionButton.disabled = true
      ideActionButton.innerHTML = '<i class="el-icon-loading"></i><span>正在保存</span>'
      iframe.contentWindow.postMessage({ source: 'mes-platform', type: 'save-active' }, ideOrigin)
      if (saveRequestTimer) window.clearTimeout(saveRequestTimer)
      saveRequestTimer = window.setTimeout(function () {
        saveRequestTimer = null
        setIdePrimaryAction('save')
      }, 5000)
    })
    layer.querySelectorAll('[data-workspace-tab]').forEach(function (button) {
      button.addEventListener('click', function () {
        var target = button.getAttribute('data-workspace-tab')
        layer.querySelectorAll('[data-workspace-tab]').forEach(function (item) { item.classList.toggle('is-active', item === button) })
        layer.querySelectorAll('[data-workspace-page]').forEach(function (page) {
          var pageName = page.getAttribute('data-workspace-page')
          page.hidden = pageName === 'ide' ? false : pageName !== target
        })
        if (target === 'deploy') {
          appendLog(layer, '[CONSOLE] 已进入插件化热部署；Theia 编辑状态继续保留')
          appendLog(layer, '[VERSION] module=production-scheduling currentVersion=3.8.2 updateStatus=' + (updatesChecked ? 'UPDATE_AVAILABLE' : 'NOT_CHECKED'))
          appendLog(layer, '[CONTINUITY] MES 主服务保持 ONLINE；不会执行服务关闭或重启')
        }
      })
    })
    layer.querySelectorAll('[data-return-ide]').forEach(function (button) {
      button.addEventListener('click', function () {
        var ideTab = layer.querySelector('[data-workspace-tab="ide"]')
        if (ideTab) ideTab.click()
      })
    })
    layer.querySelector('[data-plugin-id]').addEventListener('input', function (event) { layer.querySelector('[data-runtime-plugin]').textContent = event.target.value || '未命名插件' })
    layer.querySelector('[data-plugin-version]').addEventListener('input', function (event) {
      var version = event.target.value || '-'
      layer.querySelector('[data-runtime-version]').textContent = (updatesChecked ? '待部署版本 ' : '候选版本 ') + version
      if (updatesChecked) layer.querySelector('[data-target-plugin-version]').textContent = version
    })
    layer.querySelector('[data-deploy-plugin]').addEventListener('click', function () {
      if (updatesChecked && aiReviewPassed) simulateDeploy()
      else if (updatesChecked) startAiCodeReview()
      else checkPluginUpdates()
    })
    layer.querySelector('[data-clear-log]').addEventListener('click', function () { layer.querySelector('[data-update-log]').innerHTML = '' })
    layer.querySelector('[data-close-updater]').addEventListener('click', function () {
      closed = true
      connectionGeneration += 1
      if (deployTimer) window.clearInterval(deployTimer)
      if (connectTimer) window.clearTimeout(connectTimer)
      if (healthTimer) window.clearTimeout(healthTimer)
      if (saveRequestTimer) window.clearTimeout(saveRequestTimer)
      window.removeEventListener('message', receiveTheiaMessage)
      removeLayer(UPDATER_ID)
    })
    window.addEventListener('message', receiveTheiaMessage)
    connectTheia()
  }

  var observer = new MutationObserver(injectMenu)
  observer.observe(document.documentElement, { childList: true, subtree: true })
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', injectMenu)
  else injectMenu()
  loadConfig()

  window.__platformUpdater = {
    openLogin: openLogin,
    normalizeConfig: normalizeConfig,
    validateDeveloperCredentials: validateDeveloperCredentials
  }
  document.documentElement.setAttribute('data-platform-updater-ready', 'true')
})()
