/**
 * Publish production-line start command via MQTT (same payload as bsq-admin ProTaskController.execute)
 * 通过 MQTT 下发产线启动指令（与 bsq-admin ProTaskController.execute 报文一致）
 */
const mqtt = require('mqtt')

let client = null
let connecting = null

function buildStartPayload(workorderId, workorder) {
  const wData = [
    { name: 'produce', value: '1' }
  ]

  if (workorder) {
    const quantity = Number(workorder.quantity || 0)
    const produced = Number(workorder.quantity_produced || 0)
    const planQty = quantity - produced
    if (!Number.isFinite(planQty) || !Number.isFinite(quantity) || !Number.isFinite(produced) ||
        quantity <= 0 || produced < 0 || planQty <= 0) {
      throw new Error('Workorder has no valid remaining production quantity')
    }
    wData.push({ name: 'plan_pty', value: String(planQty) })
  }

  return {
    rw_prot: {
      Ver: '1.0.1',
      dir: 'down',
      id: '12345',
      w_data: wData
    }
  }
}

async function getClient(config) {
  if (client && client.connected) {
    return client
  }
  if (connecting) {
    return connecting
  }

  if (!client) {
    client = mqtt.connect(config.hostUrl, {
      username: config.username,
      password: config.password,
      clientId: config.clientId || `production-bridge-${Date.now()}`,
      clean: true,
      connectTimeout: (config.timeout || 100) * 1000,
      keepalive: config.keepalive || 60,
      reconnectPeriod: 5000
    })

    // Keep the reconnecting client instead of opening another client with the same ID.
    client.on('error', () => {})
  }
  const c = client
  connecting = new Promise((resolve, reject) => {
    const timer = setTimeout(() => finish(new Error('MQTT connection timed out')),
      (config.timeout || 100) * 1000)
    function finish(error) {
      clearTimeout(timer)
      c.removeListener('connect', onConnect)
      c.removeListener('error', onError)
      if (error) {
        if (client === c) client = null
        c.end(true)
        reject(error)
      } else resolve(c)
    }
    function onConnect() { finish() }
    function onError(error) { finish(error) }
    c.once('connect', onConnect)
    c.once('error', onError)
  }).finally(() => { connecting = null })

  return connecting
}

/**
 * Start production line for a workorder
 * @param {object} config MQTT config
 * @param {number|string} workorderId
 * @param {object|null} workorder DB row (optional)
 */
async function publishProductionStart(config, workorderId, workorder) {
  if (config.enabled === false || String(config.enabled).toLowerCase() === 'false') {
    throw new Error('MQTT is disabled in bridge config')
  }

  const topic = config.publishTopic || 'SubTopic1'
  const payload = JSON.stringify(buildStartPayload(workorderId, workorder))
  const mqttClient = await getClient(config)
  const qos = Number(config.qos ?? 0)
  const retain = config.retain !== false

  await new Promise((resolve, reject) => {
    mqttClient.publish(topic, payload, { qos, retain }, err => {
      if (err) {
        reject(err)
        return
      }
      resolve()
    })
  })

  return { topic, payload: JSON.parse(payload) }
}

module.exports = {
  buildStartPayload,
  publishProductionStart
}
