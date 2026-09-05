'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const zlib = require('node:zlib')
const root = path.resolve(__dirname, '..')
const dist = path.join(root, 'dist_mes')
const html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8')
const start = html.indexOf('function k(')
const loader = html.slice(start, html.indexOf('function a(', start))
const resolveChunk = vm.runInNewContext('(' + loader + ')', { a: { p: '/' } })
const chunkIds = [...new Set([...loader.matchAll(/"(chunk-[^"]+)":/g)].map(match => match[1]))]
const activeFiles = ['index.html', ...chunkIds.map(id => resolveChunk(id).split('?')[0].slice(1)),
  'static/js/flexible-scheduling-interactions.js', 'static/js/dashboard-order-sync.js',
  'static/js/schedule-feedback-link.js', 'static/js/route-qrcode-view.js', 'static/js/workorder-excel-import.js']
activeFiles.push('static/js/platform-updater.js', 'static/css/platform-updater.css')
for (const match of html.matchAll(/<(?:script|link)\b[^>]*\b(?:src|href)=["']?([^\s>"']+)/g)) {
  if (match[1].startsWith('/')) activeFiles.push(match[1].split('?')[0].slice(1))
}

test('all active entry resources and lazy-loaded JavaScript chunks exist', () => {
  assert.ok(chunkIds.length > 50)
  for (const file of activeFiles) assert.ok(fs.existsSync(path.join(dist, file)), file)
  assert.match(resolveChunk('chunk-a5928174'), /\?v=20260905-demo-reset-v7$/)
})

test('runtime JavaScript bundles and inline bootstrap parse successfully', () => {
  const files = fs.readdirSync(path.join(dist, 'static/js')).filter(file => file.endsWith('.js'))
  for (const file of files) new vm.Script(fs.readFileSync(path.join(dist, 'static/js', file), 'utf8'), { filename: file })
  for (const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)) {
    if (match[1]) new vm.Script(match[1])
  }
  assert.ok(files.length >= 350)
})

test('active gzip resources contain the same code as their uncompressed files', () => {
  for (const file of new Set(activeFiles)) {
    const full = path.join(dist, file)
    if (fs.existsSync(full + '.gz')) assert.deepEqual(zlib.gunzipSync(fs.readFileSync(full + '.gz')), fs.readFileSync(full), file)
  }
})

test('demo update manifest points to an existing package with the declared size', () => {
  const release = JSON.parse(fs.readFileSync(path.join(dist, 'updates/latest.json'), 'utf8'))
  assert.equal(fs.statSync(path.join(dist, release.packageUrl)).size, release.packageSizeBytes)
})
