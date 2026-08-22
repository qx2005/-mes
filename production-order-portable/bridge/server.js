/**
 * Production line bridge server
 * Compatible with BSQ MES frontend endpoints used by ProductionOrderPanel
 * 产线启动桥接服务，兼容生产下单页前端 API
 */
require('dotenv').config({ path: require('path').join(__dirname, '.env') })

const express = require('express')
const cors = require('cors')
const {
  isDbEnabled,
  listWorkorders,
  getWorkorderById
} = require('./lib/workorderRepository')
const { publishProductionStart } = require('./lib/mqttPublisher')

const app = express()
app.use(cors())
app.use(express.json())

const PORT = Number(process.env.PORT || 8080)

const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
}

const mqttConfig = {
  enabled: process.env.MQTT_ENABLED !== 'false',
  hostUrl: process.env.MQTT_HOST || 'tcp://127.0.0.1:1893',
  username: process.env.MQTT_USERNAME || 'bsqmes',
  password: process.env.MQTT_PASSWORD || '123456',
  clientId: process.env.MQTT_CLIENT_ID || `production-bridge-${Date.now()}`,
  timeout: Number(process.env.MQTT_TIMEOUT || 100),
  keepalive: Number(process.env.MQTT_KEEPALIVE || 60),
  publishTopic: process.env.MQTT_PUBLISH_TOPIC || 'SubTopic1',
  qos: Number(process.env.MQTT_QOS || 0),
  retain: process.env.MQTT_RETAIN !== 'false'
}

function ok(data, msg = 'success') {
  return { code: 200, msg, data }
}

function okTable(rows, msg = 'query success') {
  return { code: 200, msg, rows, total: rows.length }
}

function fail(msg, code = 500) {
  return { code, msg }
}

function mapWorkorderRow(row) {
  return {
    workorderId: row.workorder_id,
    workorderCode: row.workorder_code,
    workorderName: row.workorder_name,
    productId: row.product_id,
    productName: row.product_name,
    quantity: row.quantity,
    quantityProduced: row.quantity_produced,
    status: row.status
  }
}

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    db: isDbEnabled(dbConfig),
    mqtt: mqttConfig.hostUrl,
    publishTopic: mqttConfig.publishTopic
  })
})

/** GET /mes/pro/workorder/list */
app.get('/mes/pro/workorder/list', async (_req, res) => {
  try {
    if (!isDbEnabled(dbConfig)) {
      const mockId = Number(process.env.MOCK_WORKORDER_ID || 1)
      return res.json(
        okTable([
          mapWorkorderRow({
            workorder_id: mockId,
            workorder_code: `MO${mockId}`,
            workorder_name: 'mock-workorder',
            product_id: 1,
            product_name: 'mock-product',
            quantity: Number(process.env.MOCK_PLAN_QTY || 1),
            quantity_produced: 0,
            status: 'CONFIRMED'
          })
        ])
      )
    }

    const rows = await listWorkorders(dbConfig)
    res.json(okTable(rows.map(mapWorkorderRow)))
  } catch (err) {
    console.error('list workorder failed:', err.message)
    res.status(500).json(fail(err.message))
  }
})

/**
 * PUT /mes/pro/protask/:workorderId
 * Triggers MQTT production-line start (same as bsq-admin execute)
 */
app.put('/mes/pro/protask/:workorderId', async (req, res) => {
  const workorderId = Number(req.params.workorderId)
  if (!workorderId) {
    return res.status(400).json(fail('invalid workorderId', 400))
  }

  try {
    let workorder = null
    if (isDbEnabled(dbConfig)) {
      workorder = await getWorkorderById(dbConfig, workorderId)
      if (!workorder) {
        return res.status(404).json(fail('\u751f\u4ea7\u5de5\u5355\u4e0d\u5b58\u5728\uff01', 404))
      }
    } else {
      workorder = {
        quantity: Number(process.env.MOCK_PLAN_QTY || 1),
        quantity_produced: 0
      }
    }

    const result = await publishProductionStart(mqttConfig, workorderId, workorder)
    console.log(
      `Production line start published: workorderId=${workorderId}, topic=${result.topic}`
    )
    res.json(ok(result, '\u4e0b\u5355\u6210\u529f\uff0c\u5df2\u4e0b\u53d1\u4ea7\u7ebf\u542f\u52a8\u6307\u4ee4'))
  } catch (err) {
    console.error('execute protask failed:', err.message)
    res.status(500).json(fail('\u6267\u884c\u751f\u4ea7\u4efb\u52a1\u4e0b\u53d1\u5931\u8d25\uff01'))
  }
})

app.listen(PORT, () => {
  console.log(`Production line bridge listening on http://127.0.0.1:${PORT}`)
  console.log(`DB enabled: ${isDbEnabled(dbConfig)}`)
  console.log(`MQTT: ${mqttConfig.hostUrl} -> ${mqttConfig.publishTopic}`)
})
