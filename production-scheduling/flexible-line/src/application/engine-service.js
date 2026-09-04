'use strict' // 启用 JavaScript 严格模式，避免使用不安全的语法行为

const { SchedulingError, ValidationError } = require('../domain/errors') // 从其他模块导入当前文件需要的函数或常量
const { POLICY_WEIGHTS, DEFAULT_CALENDAR_ID, SCHEDULING_DEFAULTS } = require('../config/scheduling-policies') // 从其他模块导入当前文件需要的函数或常量

function configureEngine(workOrder, resourcePool, clock) { // 定义 configureEngine 函数，执行对应的业务处理
  const strategy = selectStrategy(workOrder, clock.now()) // 计算并保存 strategy，供后续业务逻辑使用
  if (!Object.hasOwn(POLICY_WEIGHTS, strategy)) throw new ValidationError(`不支持的排产策略: ${strategy}`) // 判断当前业务条件是否满足，并在必要时执行分支处理
  const allowedResourceIds = resourcePool.resources.filter(resource => // 计算并保存 allowedResourceIds，供后续业务逻辑使用
    resource.enabled && resource.supportedProducts?.includes(workOrder.productCode)).map(resource => resource.id) // 同时校验资源启用状态以及引擎允许使用的资源编号
  if (!allowedResourceIds.length) { // 判断当前业务条件是否满足，并在必要时执行分支处理
    throw new SchedulingError('NO_PRODUCT_RESOURCE', `没有资源支持产品 ${workOrder.productCode}`) // 创建并抛出业务异常，终止不合法的处理流程
  } // 结束当前对象或代码块
  return Object.freeze({ // 返回冻结后的业务对象，防止结果被外部意外修改
    engine: 'FINITE_CAPACITY_V1', strategy, weights: { ...POLICY_WEIGHTS[strategy] }, allowedResourceIds, // 设置 engine 字段，形成完整的业务数据结构
    calendarIds: [...new Set(resourcePool.resources.filter(item => allowedResourceIds.includes(item.id)) // 设置 calendarIds 字段，形成完整的业务数据结构
      .map(item => item.calendarId || DEFAULT_CALENDAR_ID))], // 将集合中的数据转换为目标业务结构
    minimumTimeBucketMinutes: SCHEDULING_DEFAULTS.minimumTimeBucketMinutes, // 设置 minimumTimeBucketMinutes 字段，形成完整的业务数据结构
    allowOverdue: SCHEDULING_DEFAULTS.overdueAllowedPriorities.includes(workOrder.priority), // 设置 allowOverdue 字段，形成完整的业务数据结构
    configuredAt: clock.now().toISOString() // 设置 configuredAt 字段，形成完整的业务数据结构
  }) // 结束当前函数调用或数据转换结构
} // 结束当前对象或代码块

function selectStrategy(workOrder, now) { // 定义 selectStrategy 函数，执行对应的业务处理
  const hoursUntilDeadline = (new Date(workOrder.deadline) - new Date(now)) / 3600000 // 计算并保存 hoursUntilDeadline，供后续业务逻辑使用
  if (workOrder.priority === 'critical' || hoursUntilDeadline <= 12) return 'delivery' // 判断当前业务条件是否满足，并在必要时执行分支处理
  if (workOrder.plannedQuantity >= 5000) return 'changeover' // 判断当前业务条件是否满足，并在必要时执行分支处理
  return 'balanced' // 返回当前函数计算或查询得到的结果
} // 结束当前对象或代码块

module.exports = { configureEngine, selectStrategy } // 导出当前模块的公共接口，供上层代码调用
