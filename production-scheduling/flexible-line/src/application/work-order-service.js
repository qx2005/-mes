'use strict' // 启用 JavaScript 严格模式，避免使用不安全的语法行为

const { createWorkOrderEntity } = require('../domain/work-order') // 从其他模块导入当前文件需要的函数或常量
const { assertContext } = require('./assert-context') // 从其他模块导入当前文件需要的函数或常量

async function createWorkOrder(order, context) { // 定义 createWorkOrder 函数，执行对应的业务处理
  assertContext(context, ['workOrderRepository', 'clock', 'idGenerator']) // 校验当前服务所需的仓储、时钟和编号器是否已经注入
  const existing = await context.workOrderRepository.findByOrderId(order.id) // 异步获取 existing 数据，等待仓储或服务调用完成
  if (existing) return { workOrder: existing, created: false } // 判断当前业务条件是否满足，并在必要时执行分支处理
  const workOrder = createWorkOrderEntity(order, context.clock, context.idGenerator) // 计算并保存 workOrder，供后续业务逻辑使用
  return { workOrder: await context.workOrderRepository.save(workOrder), created: true } // 组装并返回当前处理阶段的业务结果
} // 结束当前对象或代码块

module.exports = { createWorkOrder } // 导出当前模块的公共接口，供上层代码调用
