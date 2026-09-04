'use strict' // 启用 JavaScript 严格模式，避免使用不安全的语法行为

const { planProcessRoute } = require('../domain/process-route') // 从其他模块导入当前文件需要的函数或常量
const { transitionWorkOrder } = require('../domain/work-order') // 从其他模块导入当前文件需要的函数或常量
const { WORK_ORDER_STATUS } = require('../domain/constants') // 从其他模块导入当前文件需要的函数或常量
const { NotFoundError, ValidationError } = require('../domain/errors') // 从其他模块导入当前文件需要的函数或常量
const { findProduct } = require('../config/product-catalog') // 从其他模块导入当前文件需要的函数或常量
const { assertContext } = require('./assert-context') // 从其他模块导入当前文件需要的函数或常量
const { configureWorkOrderOperations } = require('./operation-service') // 从其他模块导入当前文件需要的函数或常量

async function planRoute(workOrder, operationPlan, context) { // 定义 planRoute 函数，执行对应的业务处理
  if (!context) { // 判断当前业务条件是否满足，并在必要时执行分支处理
    context = operationPlan // 更新当前对象属性，使后续计算使用最新业务状态
    operationPlan = configureWorkOrderOperations(workOrder, context.clock) // 更新当前对象属性，使后续计算使用最新业务状态
  } // 结束当前对象或代码块
  assertContext(context, ['routeRepository', 'workOrderRepository', 'clock', 'idGenerator']) // 校验当前服务所需的仓储、时钟和编号器是否已经注入
  const existing = await context.routeRepository.findByWorkOrderId(workOrder.id) // 异步获取 existing 数据，等待仓储或服务调用完成
  if (existing) return { route: existing, workOrder, created: false } // 判断当前业务条件是否满足，并在必要时执行分支处理
  if (workOrder.status !== WORK_ORDER_STATUS.ROUTING_PENDING) { // 判断当前业务条件是否满足，并在必要时执行分支处理
    throw new ValidationError(`状态为 ${workOrder.status} 的工单不能重新规划工艺`) // 创建并抛出业务异常，终止不合法的处理流程
  } // 结束当前对象或代码块
  const product = findProduct(workOrder.productCode) // 计算并保存 product，供后续业务逻辑使用
  if (!product || operationPlan.productCode !== workOrder.productCode) { // 判断当前业务条件是否满足，并在必要时执行分支处理
    throw new NotFoundError(`产品 ${workOrder.productCode} 没有匹配的工艺配置`) // 创建并抛出业务异常，终止不合法的处理流程
  } // 结束当前对象或代码块
  const route = await context.routeRepository.save( // 异步获取 route 数据，等待仓储或服务调用完成
    planProcessRoute(workOrder, operationPlan, context.clock, context.idGenerator)) // 调用当前业务函数执行对应处理
  const updatedWorkOrder = await context.workOrderRepository.save(transitionWorkOrder( // 异步获取 updatedWorkOrder 数据，等待仓储或服务调用完成
    workOrder, WORK_ORDER_STATUS.SCHEDULING_PENDING, context.clock, { routeId: route.id })) // 补充当前多行表达式所需的业务参数或计算条件
  return { route, workOrder: updatedWorkOrder, created: true } // 组装并返回当前处理阶段的业务结果
} // 结束当前对象或代码块

module.exports = { planRoute } // 导出当前模块的公共接口，供上层代码调用
