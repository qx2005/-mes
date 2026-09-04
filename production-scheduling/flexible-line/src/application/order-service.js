'use strict' // 启用 JavaScript 严格模式，避免使用不安全的语法行为

const { createProductionOrder, requiredText } = require('../domain/production-order') // 从其他模块导入当前文件需要的函数或常量
const { NotFoundError } = require('../domain/errors') // 从其他模块导入当前文件需要的函数或常量
const { findProduct } = require('../config/product-catalog') // 从其他模块导入当前文件需要的函数或常量
const { assertContext } = require('./assert-context') // 从其他模块导入当前文件需要的函数或常量

async function importOrder(rawOrder, context) { // 定义 importOrder 函数，执行对应的业务处理
  assertContext(context, ['orderRepository', 'clock', 'idGenerator']) // 校验当前服务所需的仓储、时钟和编号器是否已经注入
  const externalOrderCode = requiredText(rawOrder?.orderCode, 'orderCode') // 计算并保存 externalOrderCode，供后续业务逻辑使用
  const existing = await context.orderRepository.findByExternalOrderCode(externalOrderCode) // 异步获取 existing 数据，等待仓储或服务调用完成
  if (existing) return { order: existing, created: false } // 判断当前业务条件是否满足，并在必要时执行分支处理
  const product = findProduct(rawOrder.productCode) // 计算并保存 product，供后续业务逻辑使用
  if (!product) { // 判断当前业务条件是否满足，并在必要时执行分支处理
    throw new NotFoundError(`产品 ${rawOrder.productCode || ''} 没有已发布的生产模板`, { // 创建并抛出业务异常，终止不合法的处理流程
      productCode: rawOrder.productCode // 设置 productCode 字段，形成完整的业务数据结构
    }) // 结束当前函数调用或数据转换结构
  } // 结束当前对象或代码块
  const order = createProductionOrder(rawOrder, product, context.clock, context.idGenerator) // 计算并保存 order，供后续业务逻辑使用
  return { order: await context.orderRepository.save(order), created: true } // 组装并返回当前处理阶段的业务结果
} // 结束当前对象或代码块

module.exports = { importOrder } // 导出当前模块的公共接口，供上层代码调用
