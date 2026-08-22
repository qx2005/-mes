/**
 * Workorder data access (MySQL pro_workorder table)
 * 工单数据访问（MySQL pro_workorder 表）
 */
const mysql = require('mysql2/promise')

let pool = null

function isDbEnabled(config) {
  return Boolean(config && config.host && config.database)
}

async function getPool(config) {
  if (!isDbEnabled(config)) {
    return null
  }
  if (!pool) {
    pool = mysql.createPool({
      host: config.host,
      port: Number(config.port || 3306),
      user: config.user,
      password: config.password,
      database: config.database,
      waitForConnections: true,
      connectionLimit: 5
    })
  }
  return pool
}

async function listWorkorders(dbConfig) {
  const p = await getPool(dbConfig)
  if (!p) {
    return []
  }

  const [rows] = await p.query(
    `SELECT workorder_id, workorder_code, workorder_name, product_id, product_name,
            quantity, quantity_produced, status, create_time
     FROM pro_workorder
     ORDER BY workorder_id ASC`
  )
  return rows
}

async function getWorkorderById(dbConfig, workorderId) {
  const p = await getPool(dbConfig)
  if (!p) {
    return null
  }

  const [rows] = await p.query(
    `SELECT workorder_id, workorder_code, workorder_name, product_id, product_name,
            quantity, quantity_produced, status
     FROM pro_workorder
     WHERE workorder_id = ?
     LIMIT 1`,
    [workorderId]
  )
  return rows[0] || null
}

module.exports = {
  isDbEnabled,
  listWorkorders,
  getWorkorderById
}
