'use strict' // 启用 JavaScript 严格模式，避免使用不安全的语法行为

const { transitionWorkOrder } = require('../domain/work-order') // 从其他模块导入当前文件需要的函数或常量
const { WORK_ORDER_STATUS } = require('../domain/constants') // 从其他模块导入当前文件需要的函数或常量
const { ValidationError } = require('../domain/errors') // 从其他模块导入当前文件需要的函数或常量
const { generateFiniteCapacitySchedule } = require('../scheduling/finite-capacity-scheduler') // 从其他模块导入当前文件需要的函数或常量
const { assertContext } = require('./assert-context') // 从其他模块导入当前文件需要的函数或常量

async function generateSchedule(workOrder, route, engineDecision, resourcePool, context) { // 定义 generateSchedule 函数，执行对应的业务处理
  assertContext(context, ['scheduleRepository', 'workOrderRepository', 'clock', 'idGenerator']) // 校验当前服务所需的仓储、时钟和编号器是否已经注入
  const existing = await context.scheduleRepository.findByWorkOrderId(workOrder.id) // 异步获取 existing 数据，等待仓储或服务调用完成
  if (existing) return { schedulePlan: existing, workOrder, created: false } // 判断当前业务条件是否满足，并在必要时执行分支处理
  if (workOrder.status !== WORK_ORDER_STATUS.SCHEDULING_PENDING) { // 判断当前业务条件是否满足，并在必要时执行分支处理
    throw new ValidationError(`状态为 ${workOrder.status} 的工单不能执行排产`) // 创建并抛出业务异常，终止不合法的处理流程
  } // 结束当前对象或代码块
  const schedulePlan = await context.scheduleRepository.save(generateFiniteCapacitySchedule({ // 异步获取 schedulePlan 数据，等待仓储或服务调用完成
    workOrder, route, engineConfig: engineDecision, resourcePool, // 补充当前多行表达式所需的业务参数或计算条件
    clock: context.clock, idGenerator: context.idGenerator // 设置 clock 字段，形成完整的业务数据结构
  })) // 结束当前函数调用或数据转换结构
  const updatedWorkOrder = await context.workOrderRepository.save(transitionWorkOrder( // 异步获取 updatedWorkOrder 数据，等待仓储或服务调用完成
    workOrder, WORK_ORDER_STATUS.SCHEDULED, context.clock, { schedulePlanId: schedulePlan.id })) // 补充当前多行表达式所需的业务参数或计算条件
  return { schedulePlan, workOrder: updatedWorkOrder, created: true } // 组装并返回当前处理阶段的业务结果
} // 结束当前对象或代码块

module.exports = { generateSchedule } // 导出当前模块的公共接口，供上层代码调用
