'use strict' // 启用 JavaScript 严格模式，避免使用不安全的语法行为

const { ORDER_PRIORITIES } = require('./constants') // 从其他模块导入当前文件需要的函数或常量
const { ValidationError } = require('./errors') // 从其他模块导入当前文件需要的函数或常量

function requiredText(value, field) { // 定义 requiredText 函数，执行对应的业务处理
  const normalized = String(value ?? '').trim() // 计算并保存 normalized，供后续业务逻辑使用
  if (!normalized) throw new ValidationError(`${field} 不能为空`, { field }) // 判断当前业务条件是否满足，并在必要时执行分支处理
  return normalized // 返回当前函数计算或查询得到的结果
} // 结束当前对象或代码块

function normalizeDate(value, field) { // 定义 normalizeDate 函数，执行对应的业务处理
  const date = new Date(value) // 计算并保存 date，供后续业务逻辑使用
  if (Number.isNaN(date.getTime())) throw new ValidationError(`${field} 不是有效时间`, { field, value }) // 判断当前业务条件是否满足，并在必要时执行分支处理
  return date.toISOString() // 返回当前函数计算或查询得到的结果
} // 结束当前对象或代码块

function createProductionOrder(rawOrder, product, clock, idGenerator) { // 定义 createProductionOrder 函数，执行对应的业务处理
  if (!rawOrder || typeof rawOrder !== 'object') throw new ValidationError('导入订单必须是对象') // 判断当前业务条件是否满足，并在必要时执行分支处理
  const quantity = Number(rawOrder.quantity) // 计算并保存 quantity，供后续业务逻辑使用
  if (!Number.isFinite(quantity) || quantity <= 0) { // 判断当前业务条件是否满足，并在必要时执行分支处理
    throw new ValidationError('quantity 必须是大于 0 的数字', { field: 'quantity' }) // 创建并抛出业务异常，终止不合法的处理流程
  } // 结束当前对象或代码块
  const priority = String(rawOrder.priority || 'normal').trim().toLowerCase() // 计算并保存 priority，供后续业务逻辑使用
  if (!ORDER_PRIORITIES.includes(priority)) { // 判断当前业务条件是否满足，并在必要时执行分支处理
    throw new ValidationError(`不支持的订单优先级: ${priority}`, { priority }) // 创建并抛出业务异常，终止不合法的处理流程
  } // 结束当前对象或代码块
  const importedAt = clock.now().toISOString() // 计算并保存 importedAt，供后续业务逻辑使用
  const deadline = normalizeDate(rawOrder.deadline, 'deadline') // 计算并保存 deadline，供后续业务逻辑使用
  if (new Date(deadline) <= new Date(importedAt)) { // 判断当前业务条件是否满足，并在必要时执行分支处理
    throw new ValidationError('deadline 必须晚于订单导入时间', { deadline, importedAt }) // 创建并抛出业务异常，终止不合法的处理流程
  } // 结束当前对象或代码块

  return Object.freeze({ // 返回冻结后的业务对象，防止结果被外部意外修改
    id: idGenerator.next('ORD'), // 设置 id 字段，形成完整的业务数据结构
    externalOrderCode: requiredText(rawOrder.orderCode, 'orderCode'), // 设置 externalOrderCode 字段，形成完整的业务数据结构
    source: requiredText(rawOrder.source || 'FILE_IMPORT', 'source'), // 设置 source 字段，形成完整的业务数据结构
    productCode: product.productCode, // 设置 productCode 字段，形成完整的业务数据结构
    productName: product.productName, // 设置 productName 字段，形成完整的业务数据结构
    categoryCode: product.categoryCode, // 设置 categoryCode 字段，形成完整的业务数据结构
    categoryName: product.categoryName, // 设置 categoryName 字段，形成完整的业务数据结构
    quantity, // 传递或返回 quantity 业务数据
    unit: requiredText(rawOrder.unit || product.unit, 'unit'), // 设置 unit 字段，形成完整的业务数据结构
    deadline, // 传递或返回 deadline 业务数据
    priority, // 传递或返回 priority 业务数据
    importedAt // 传递或返回 importedAt 业务数据
  }) // 结束当前函数调用或数据转换结构
} // 结束当前对象或代码块

module.exports = { createProductionOrder, normalizeDate, requiredText } // 导出当前模块的公共接口，供上层代码调用
