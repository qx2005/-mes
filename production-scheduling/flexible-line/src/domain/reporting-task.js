'use strict' // 启用 JavaScript 严格模式，避免使用不安全的语法行为

const { REPORT_STATUS, WORK_ORDER_STATUS } = require('./constants') // 从其他模块导入当前文件需要的函数或常量
const { ConflictError, ValidationError } = require('./errors') // 从其他模块导入当前文件需要的函数或常量

function createReportingTask(workOrder, scheduledOperation, idGenerator, clock) { // 定义 createReportingTask 函数，执行对应的业务处理
  return { // 组装并返回当前处理阶段的业务结果
    id: idGenerator.next('REPORT'), // 设置 id 字段，形成完整的业务数据结构
    workOrderId: workOrder.id, // 设置 workOrderId 字段，形成完整的业务数据结构
    schedulePlanId: workOrder.schedulePlanId, // 设置 schedulePlanId 字段，形成完整的业务数据结构
    operationCode: scheduledOperation.operationCode, // 设置 operationCode 字段，形成完整的业务数据结构
    operationName: scheduledOperation.operationName, // 设置 operationName 字段，形成完整的业务数据结构
    resourceId: scheduledOperation.resourceId, // 设置 resourceId 字段，形成完整的业务数据结构
    plannedQuantity: workOrder.plannedQuantity, // 设置 plannedQuantity 字段，形成完整的业务数据结构
    goodQuantity: 0, // 设置 goodQuantity 字段，形成完整的业务数据结构
    defectQuantity: 0, // 设置 defectQuantity 字段，形成完整的业务数据结构
    status: REPORT_STATUS.PENDING, // 设置 status 字段，形成完整的业务数据结构
    plannedStart: scheduledOperation.startTime, // 设置 plannedStart 字段，形成完整的业务数据结构
    plannedEnd: scheduledOperation.endTime, // 设置 plannedEnd 字段，形成完整的业务数据结构
    createdAt: clock.now().toISOString() // 设置 createdAt 字段，形成完整的业务数据结构
  } // 结束当前对象或代码块
} // 结束当前对象或代码块

function recordProduction(task, workOrder, report, clock) { // 定义 recordProduction 函数，执行对应的业务处理
  if (![WORK_ORDER_STATUS.IN_PROGRESS, WORK_ORDER_STATUS.COMPLETED].includes(workOrder.status)) { // 判断当前业务条件是否满足，并在必要时执行分支处理
    throw new ConflictError('工单未开始生产，不能提交报工', { workOrderId: workOrder.id }) // 创建并抛出业务异常，终止不合法的处理流程
  } // 结束当前对象或代码块
  const goodQuantity = Number(report.goodQuantity) // 计算并保存 goodQuantity，供后续业务逻辑使用
  const defectQuantity = Number(report.defectQuantity) // 计算并保存 defectQuantity，供后续业务逻辑使用
  if (!Number.isFinite(goodQuantity) || !Number.isFinite(defectQuantity) || goodQuantity < 0 || defectQuantity < 0) { // 判断当前业务条件是否满足，并在必要时执行分支处理
    throw new ValidationError('合格数量和不良数量必须是非负数字') // 创建并抛出业务异常，终止不合法的处理流程
  } // 结束当前对象或代码块
  const accumulated = task.goodQuantity + task.defectQuantity + goodQuantity + defectQuantity // 计算并保存 accumulated，供后续业务逻辑使用
  if (accumulated > task.plannedQuantity) { // 判断当前业务条件是否满足，并在必要时执行分支处理
    throw new ValidationError('累计报工数量不能超过计划数量', { accumulated, planned: task.plannedQuantity }) // 创建并抛出业务异常，终止不合法的处理流程
  } // 结束当前对象或代码块
  return { // 组装并返回当前处理阶段的业务结果
    ...task, // 展开原有对象字段并保留已有业务数据
    goodQuantity: task.goodQuantity + goodQuantity, // 设置 goodQuantity 字段，形成完整的业务数据结构
    defectQuantity: task.defectQuantity + defectQuantity, // 设置 defectQuantity 字段，形成完整的业务数据结构
    status: accumulated === task.plannedQuantity ? REPORT_STATUS.COMPLETED : REPORT_STATUS.IN_PROGRESS, // 设置 status 字段，形成完整的业务数据结构
    lastReportedAt: clock.now().toISOString() // 设置 lastReportedAt 字段，形成完整的业务数据结构
  } // 结束当前对象或代码块
} // 结束当前对象或代码块

module.exports = { createReportingTask, recordProduction } // 导出当前模块的公共接口，供上层代码调用
