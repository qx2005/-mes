'use strict' // 启用 JavaScript 严格模式，避免使用不安全的语法行为

const { WORK_ORDER_STATUS } = require('./constants') // 从其他模块导入当前文件需要的函数或常量
const { ConflictError } = require('./errors') // 从其他模块导入当前文件需要的函数或常量

const ALLOWED_TRANSITIONS = Object.freeze({ // 计算并保存 ALLOWED_TRANSITIONS，供后续业务逻辑使用
  [WORK_ORDER_STATUS.ROUTING_PENDING]: [WORK_ORDER_STATUS.SCHEDULING_PENDING], // 配置当前工单状态允许转换到的下一状态
  [WORK_ORDER_STATUS.SCHEDULING_PENDING]: [WORK_ORDER_STATUS.SCHEDULED], // 配置当前工单状态允许转换到的下一状态
  [WORK_ORDER_STATUS.SCHEDULED]: [WORK_ORDER_STATUS.IN_PROGRESS], // 配置当前工单状态允许转换到的下一状态
  [WORK_ORDER_STATUS.IN_PROGRESS]: [WORK_ORDER_STATUS.COMPLETED], // 配置当前工单状态允许转换到的下一状态
  [WORK_ORDER_STATUS.COMPLETED]: [] // 配置当前工单状态允许转换到的下一状态
}) // 结束当前函数调用或数据转换结构

function createWorkOrderEntity(order, clock, idGenerator) { // 定义 createWorkOrderEntity 函数，执行对应的业务处理
  const now = clock.now().toISOString() // 计算并保存 now，供后续业务逻辑使用
  return { // 组装并返回当前处理阶段的业务结果
    id: idGenerator.next('WO'), // 设置 id 字段，形成完整的业务数据结构
    orderId: order.id, // 设置 orderId 字段，形成完整的业务数据结构
    orderCode: order.externalOrderCode, // 设置 orderCode 字段，形成完整的业务数据结构
    productCode: order.productCode, // 设置 productCode 字段，形成完整的业务数据结构
    productName: order.productName, // 设置 productName 字段，形成完整的业务数据结构
    categoryCode: order.categoryCode, // 设置 categoryCode 字段，形成完整的业务数据结构
    plannedQuantity: order.quantity, // 设置 plannedQuantity 字段，形成完整的业务数据结构
    unit: order.unit, // 设置 unit 字段，形成完整的业务数据结构
    deadline: order.deadline, // 设置 deadline 字段，形成完整的业务数据结构
    priority: order.priority, // 设置 priority 字段，形成完整的业务数据结构
    status: WORK_ORDER_STATUS.ROUTING_PENDING, // 设置 status 字段，形成完整的业务数据结构
    routeId: null, // 设置 routeId 字段，形成完整的业务数据结构
    schedulePlanId: null, // 设置 schedulePlanId 字段，形成完整的业务数据结构
    createdAt: now, // 设置 createdAt 字段，形成完整的业务数据结构
    updatedAt: now // 设置 updatedAt 字段，形成完整的业务数据结构
  } // 结束当前对象或代码块
} // 结束当前对象或代码块

function transitionWorkOrder(workOrder, targetStatus, clock, patch = {}) { // 定义 transitionWorkOrder 函数，执行对应的业务处理
  const allowed = ALLOWED_TRANSITIONS[workOrder.status] || [] // 计算并保存 allowed，供后续业务逻辑使用
  if (!allowed.includes(targetStatus)) { // 判断当前业务条件是否满足，并在必要时执行分支处理
    throw new ConflictError(`工单不能从 ${workOrder.status} 转换为 ${targetStatus}`, { // 创建并抛出业务异常，终止不合法的处理流程
      workOrderId: workOrder.id, // 设置 workOrderId 字段，形成完整的业务数据结构
      currentStatus: workOrder.status, // 设置 currentStatus 字段，形成完整的业务数据结构
      targetStatus // 传递或返回 targetStatus 业务数据
    }) // 结束当前函数调用或数据转换结构
  } // 结束当前对象或代码块
  return { ...workOrder, ...patch, status: targetStatus, updatedAt: clock.now().toISOString() } // 组装并返回当前处理阶段的业务结果
} // 结束当前对象或代码块

module.exports = { ALLOWED_TRANSITIONS, createWorkOrderEntity, transitionWorkOrder } // 导出当前模块的公共接口，供上层代码调用
