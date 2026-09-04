'use strict' // 启用 JavaScript 严格模式，避免使用不安全的语法行为

const { createReportingTask } = require('../domain/reporting-task') // 从其他模块导入当前文件需要的函数或常量
const { WORK_ORDER_STATUS } = require('../domain/constants') // 从其他模块导入当前文件需要的函数或常量
const { ValidationError } = require('../domain/errors') // 从其他模块导入当前文件需要的函数或常量
const { assertContext } = require('./assert-context') // 从其他模块导入当前文件需要的函数或常量

async function initializeReporting(workOrder, schedulePlan, context) { // 定义 initializeReporting 函数，执行对应的业务处理
  assertContext(context, ['reportingRepository', 'clock', 'idGenerator']) // 校验当前服务所需的仓储、时钟和编号器是否已经注入
  const existing = await context.reportingRepository.listByWorkOrderId(workOrder.id) // 异步获取 existing 数据，等待仓储或服务调用完成
  if (existing.length) return { reportingTasks: existing, created: false } // 判断当前业务条件是否满足，并在必要时执行分支处理
  if (workOrder.status !== WORK_ORDER_STATUS.SCHEDULED) { // 判断当前业务条件是否满足，并在必要时执行分支处理
    throw new ValidationError('只有已排产工单才能初始化报工任务') // 创建并抛出业务异常，终止不合法的处理流程
  } // 结束当前对象或代码块
  const tasks = schedulePlan.operations.map(operation => // 计算并保存 tasks，供后续业务逻辑使用
    createReportingTask(workOrder, operation, context.idGenerator, context.clock)) // 调用当前业务函数执行对应处理
  return { reportingTasks: await context.reportingRepository.saveAll(tasks), created: true } // 组装并返回当前处理阶段的业务结果
} // 结束当前对象或代码块

module.exports = { initializeReporting } // 导出当前模块的公共接口，供上层代码调用
