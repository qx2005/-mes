'use strict'

const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const hash = data => crypto.createHash('sha256').update(data).digest('hex')

function paths(root) {
  root = fs.realpathSync(root)
  return { root, workspace: path.join(root, 'ide-workspace', 'bsq_usr'), baseline: path.join(root, 'ide-baseline', 'bsq_usr'), manifest: path.join(root, 'ide-baseline', 'manifest.json') }
}
function inside(root, relative) {
  const target = path.resolve(root, relative)
  const rel = path.relative(root, target)
  if (!rel || rel === '..' || rel.startsWith('..' + path.sep) || path.isAbsolute(rel)) throw new Error('Unsafe IDE baseline path')
  return target
}
function assertPlainTreeRoot(root, target) {
  let current = root
  for (const part of path.relative(root, target).split(path.sep)) {
    current = path.join(current, part)
    if (fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink()) throw new Error('IDE root must not be a symbolic link')
  }
}
function capture(root) {
  const p = paths(root)
  if (fs.existsSync(p.manifest) || fs.existsSync(p.baseline)) throw new Error('IDE baseline already exists; refusing to overwrite it')
  assertPlainTreeRoot(p.root, p.workspace)
  const files = [], directories = []
  function visit(relative) {
    const source = relative ? inside(p.workspace, relative) : p.workspace
    const info = fs.lstatSync(source)
    if (info.isSymbolicLink()) throw new Error('Cannot snapshot a symbolic link: ' + relative)
    if (info.isDirectory()) {
      if (relative) directories.push(relative)
      for (const name of fs.readdirSync(source).sort()) visit(path.join(relative, name))
    } else if (info.isFile()) {
      const data = fs.readFileSync(source)
      files.push({ path: relative, size: data.length, sha256: hash(data) })
    } else throw new Error('Unsupported IDE entry: ' + relative)
  }
  visit('')
  fs.mkdirSync(p.baseline, { recursive: true })
  for (const dir of directories) fs.mkdirSync(inside(p.baseline, dir), { recursive: true })
  for (const file of files) {
    const source = inside(p.workspace, file.path), destination = inside(p.baseline, file.path)
    fs.copyFileSync(source, destination)
    if (hash(fs.readFileSync(destination)) !== file.sha256) throw new Error('IDE changed during capture: ' + file.path)
  }
  const manifest = { version: 1, capturedAt: new Date().toISOString(), files, directories }
  manifest.id = hash(JSON.stringify(files))
  fs.writeFileSync(p.manifest, JSON.stringify(manifest, null, 2))
  return { id: manifest.id, capturedAt: manifest.capturedAt, fileCount: files.length }
}
function readManifest(root) {
  const p = paths(root)
  assertPlainTreeRoot(p.root, p.baseline)
  const manifest = JSON.parse(fs.readFileSync(p.manifest, 'utf8'))
  if (manifest.version !== 1 || !Array.isArray(manifest.files) || !manifest.files.length || hash(JSON.stringify(manifest.files)) !== manifest.id) throw new Error('Invalid IDE baseline manifest')
  return { p, manifest }
}
function status(root) {
  const { manifest } = readManifest(root)
  return { id: manifest.id, capturedAt: manifest.capturedAt, fileCount: manifest.files.length }
}
function restore(root) {
  const { p, manifest } = readManifest(root)
  assertPlainTreeRoot(p.root, p.workspace)
  // Validate every source before removing or replacing anything in the workspace.
  for (const file of manifest.files) {
    const source = inside(p.baseline, file.path)
    assertPlainTreeRoot(p.baseline, source)
    if (hash(fs.readFileSync(source)) !== file.sha256) throw new Error('IDE baseline checksum mismatch: ' + file.path)
  }
  const allowedFiles = new Map(manifest.files.map(file => [path.normalize(file.path), file]))
  const allowedDirs = new Set(manifest.directories.map(dir => path.normalize(dir)))
  function prune(relative) {
    const directory = relative ? inside(p.workspace, relative) : p.workspace
    for (const name of fs.readdirSync(directory)) {
      const rel = path.join(relative, name), target = inside(p.workspace, rel)
      const info = fs.lstatSync(target)
      if (info.isSymbolicLink() || (info.isDirectory() ? !allowedDirs.has(rel) : !allowedFiles.has(rel))) {
        // target was resolved and checked within the explicitly isolated workspace.
        if (info.isSymbolicLink()) fs.unlinkSync(target)
        else fs.rmSync(target, { recursive: info.isDirectory(), force: true })
      } else if (info.isDirectory()) prune(rel)
    }
  }
  fs.mkdirSync(p.workspace, { recursive: true })
  prune('')
  for (const dir of manifest.directories) fs.mkdirSync(inside(p.workspace, dir), { recursive: true })
  let restored = 0
  for (const file of manifest.files) {
    const destination = inside(p.workspace, file.path)
    if (fs.existsSync(destination) && hash(fs.readFileSync(destination)) === file.sha256) continue
    if (fs.existsSync(destination)) fs.chmodSync(destination, 0o666)
    fs.copyFileSync(inside(p.baseline, file.path), destination)
    fs.chmodSync(destination, 0o666)
    restored += 1
  }
  return { ...status(root), restored }
}
module.exports = { capture, status, restore }
if (require.main === module) {
  try {
    const action = process.argv[2]
    if (!['capture', 'status', 'restore'].includes(action)) throw new Error('Unknown IDE baseline action')
    process.stdout.write(JSON.stringify(module.exports[action](path.resolve(__dirname, '..'))))
  } catch (error) { process.stderr.write(error.message); process.exitCode = 1 }
}
