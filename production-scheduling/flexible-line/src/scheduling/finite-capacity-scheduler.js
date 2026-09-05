'use strict' // 启用 JavaScript 严格模式，避免使用不安全的语法行为

const { SchedulingError, ValidationError } = require('../domain/errors') // 从其他模块导入当前文件需要的函数或常量
const { findAvailableSlot } = require('./working-calendar') // 从其他模块导入当前文件需要的函数或常量
const { DEFAULT_CALENDAR_ID } = require('../config/scheduling-policies')
function generateFiniteCapacitySchedule({ workOrder, route, engineConfig, resourcePool, clock, idGenerator }) { // 定义 generateFiniteCapacitySchedule 函数，执行对应的业务处理
  validateSchedulingInput(workOrder, route, engineConfig, resourcePool) // 调用当前业务函数执行对应处理
  const resources = resourcePool.resources.filter(resource => // 计算并保存 resources，供后续业务逻辑使用
    resource.enabled && engineConfig.allowedResourceIds.includes(resource.id)) // 同时校验资源启用状态以及引擎允许使用的资源编号
    .map(resource => ({ ...resource, bookings: [...(resource.bookings || [])] })) // 将集合中的数据转换为目标业务结构
  const calendars = new Map(resourcePool.calendars.map(calendar => [calendar.id, calendar])) // 计算并保存 calendars，供后续业务逻辑使用
  const operationEndTimes = new Map() // 计算并保存 operationEndTimes，供后续业务逻辑使用
  const scheduledOperations = [] // 计算并保存 scheduledOperations，供后续业务逻辑使用

  for (const operation of route.operations) { // 遍历当前数据集合，逐项执行业务处理
    const dependencyEnd = operation.dependencies.reduce((latest, code) => { // 计算并保存 dependencyEnd，供后续业务逻辑使用
      const end = operationEndTimes.get(code) // 计算并保存 end，供后续业务逻辑使用
      return end && end > latest ? end : latest // 返回当前函数计算或查询得到的结果
    }, clock.now()) // 结束当前数据项并继续配置下一项
    const candidates = resources.filter(resource => isEligibleResource(resource, operation, workOrder)) // 计算并保存 candidates，供后续业务逻辑使用
      .map(resource => evaluateResourceCandidate({ // 将集合中的数据转换为目标业务结构
        resource, // 传递或返回 resource 业务数据
        operation, // 传递或返回 operation 业务数据
        workOrder, // 传递或返回 workOrder 业务数据
        earliest: dependencyEnd, // 设置 earliest 字段，形成完整的业务数据结构
        calendar: calendars.get(resource.calendarId || DEFAULT_CALENDAR_ID), // 与引擎保持相同的默认日历
        engineConfig, // 传递或返回 engineConfig 业务数据
        changeoverMatrix: resourcePool.changeoverMatrix // 设置 changeoverMatrix 字段，形成完整的业务数据结构
      })) // 结束当前函数调用或数据转换结构
      .sort(compareCandidates) // 按照既定规则对候选结果进行排序

    if (!candidates.length) { // 判断当前业务条件是否满足，并在必要时执行分支处理
      throw new SchedulingError('NO_COMPATIBLE_RESOURCE', // 创建并抛出业务异常，终止不合法的处理流程
        `工序 ${operation.code} 没有支持品类 ${workOrder.productCode} 的可用资源`, // 生成包含当前业务数据的动态文本内容
        { operationCode: operation.code, productCode: workOrder.productCode }) // 补充当前结果或异常所需的详细业务字段
    } // 结束当前对象或代码块
    const best = candidates[0] // 计算并保存 best，供后续业务逻辑使用
    best.resource.bookings.push({ // 向当前集合追加一条新的业务记录
      start: best.start.toISOString(), // 设置 start 字段，形成完整的业务数据结构
      end: best.end.toISOString(), // 设置 end 字段，形成完整的业务数据结构
      productCode: workOrder.productCode, // 设置 productCode 字段，形成完整的业务数据结构
      operationCode: operation.code, // 设置 operationCode 字段，形成完整的业务数据结构
      workOrderId: workOrder.id // 设置 workOrderId 字段，形成完整的业务数据结构
    }) // 结束当前函数调用或数据转换结构
    best.resource.currentProductCode = workOrder.productCode // 更新当前对象属性，使后续计算使用最新业务状态
    operationEndTimes.set(operation.code, best.end) // 将当前键值写入映射表，供后续工序查询
    scheduledOperations.push({ // 向当前集合追加一条新的业务记录
      sequence: operation.sequence, // 设置 sequence 字段，形成完整的业务数据结构
      operationCode: operation.code, // 设置 operationCode 字段，形成完整的业务数据结构
      operationName: operation.name, // 设置 operationName 字段，形成完整的业务数据结构
      resourceId: best.resource.id, // 设置 resourceId 字段，形成完整的业务数据结构
      resourceName: best.resource.name, // 设置 resourceName 字段，形成完整的业务数据结构
      startTime: best.start.toISOString(), // 设置 startTime 字段，形成完整的业务数据结构
      endTime: best.end.toISOString(), // 设置 endTime 字段，形成完整的业务数据结构
      batchCount: best.batchCount, // 设置 batchCount 字段，形成完整的业务数据结构
      preparationMinutes: best.preparationMinutes, // 设置 preparationMinutes 字段，形成完整的业务数据结构
      changeoverMinutes: best.changeoverMinutes, // 设置 changeoverMinutes 字段，形成完整的业务数据结构
      processingMinutes: best.processingMinutes, // 设置 processingMinutes 字段，形成完整的业务数据结构
      score: round(best.score, 4), // 设置 score 字段，形成完整的业务数据结构
      reason: buildReason(best) // 设置 reason 字段，形成完整的业务数据结构
    }) // 结束当前函数调用或数据转换结构
  } // 结束当前对象或代码块

  const plannedStart = scheduledOperations.reduce((earliest, item) => item.startTime < earliest ? item.startTime : earliest, scheduledOperations[0].startTime) // 包含所有并行工序的最早开始时间
  const plannedEnd = scheduledOperations.reduce((latest, item) => item.endTime > latest ? item.endTime : latest, scheduledOperations[0].endTime) // 包含所有并行工序的最晚结束时间
  const overdueMinutes = Math.max(0, Math.ceil((new Date(plannedEnd) - new Date(workOrder.deadline)) / 60000)) // 计算并保存 overdueMinutes，供后续业务逻辑使用
  if (overdueMinutes > 0 && !engineConfig.allowOverdue) { // 判断当前业务条件是否满足，并在必要时执行分支处理
    throw new SchedulingError('DEADLINE_UNACHIEVABLE', // 创建并抛出业务异常，终止不合法的处理流程
      `现有资源无法在交期前完成工单 ${workOrder.id}`, { plannedEnd, deadline: workOrder.deadline, overdueMinutes }) // 补充当前多行表达式所需的业务参数或计算条件
  } // 结束当前对象或代码块

  return Object.freeze({ // 返回冻结后的业务对象，防止结果被外部意外修改
    id: idGenerator.next('PLAN'), // 设置 id 字段，形成完整的业务数据结构
    planCode: idGenerator.next('FSP'), // 设置 planCode 字段，形成完整的业务数据结构
    workOrderId: workOrder.id, // 设置 workOrderId 字段，形成完整的业务数据结构
    engine: engineConfig.engine, // 设置 engine 字段，形成完整的业务数据结构
    strategy: engineConfig.strategy, // 设置 strategy 字段，形成完整的业务数据结构
    parameterSnapshot: structuredClone(engineConfig), // 设置 parameterSnapshot 字段，形成完整的业务数据结构
    plannedStart, // 传递或返回 plannedStart 业务数据
    plannedEnd, // 传递或返回 plannedEnd 业务数据
    overdueMinutes, // 传递或返回 overdueMinutes 业务数据
    status: overdueMinutes ? 'AT_RISK' : 'EXECUTABLE', // 设置 status 字段，形成完整的业务数据结构
    operations: scheduledOperations, // 设置 operations 字段，形成完整的业务数据结构
    createdAt: clock.now().toISOString() // 设置 createdAt 字段，形成完整的业务数据结构
  }) // 结束当前函数调用或数据转换结构
} // 结束当前对象或代码块

function evaluateResourceCandidate({ resource, operation, workOrder, earliest, calendar, engineConfig, changeoverMatrix }) { // 定义 evaluateResourceCandidate 函数，执行对应的业务处理
  if (!calendar) throw new SchedulingError('CALENDAR_NOT_FOUND', `资源 ${resource.id} 的工作日历不存在`) // 判断当前业务条件是否满足，并在必要时执行分支处理
  const rate = Number(resource.operationRates?.[operation.code]) // 计算并保存 rate，供后续业务逻辑使用
  if (!Number.isFinite(rate) || rate <= 0) { // 判断当前业务条件是否满足，并在必要时执行分支处理
    throw new SchedulingError('INVALID_CAPACITY', `资源 ${resource.id} 的工序 ${operation.code} 产能无效`) // 创建并抛出业务异常，终止不合法的处理流程
  } // 结束当前对象或代码块
  const processingMinutes = Math.ceil(workOrder.plannedQuantity / rate * 60) // 计算并保存 processingMinutes，供后续业务逻辑使用
  const batchSize = Number(operation.standardBatchSize || workOrder.plannedQuantity) // 计算并保存 batchSize，供后续业务逻辑使用
  if (!Number.isFinite(batchSize) || batchSize <= 0) { // 判断当前业务条件是否满足，并在必要时执行分支处理
    throw new SchedulingError('INVALID_BATCH_SIZE', `工序 ${operation.code} 的标准批量无效`) // 创建并抛出业务异常，终止不合法的处理流程
  } // 结束当前对象或代码块
  const batchCount = Math.ceil(workOrder.plannedQuantity / batchSize) // 计算并保存 batchCount，供后续业务逻辑使用
  const preparationMinutes = Number(operation.preparationMinutes || 0) * batchCount // 计算并保存 preparationMinutes，供后续业务逻辑使用
  const changeoverMinutes = resolveChangeoverMinutes(resource.currentProductCode, workOrder.productCode, changeoverMatrix) // 计算并保存 changeoverMinutes，供后续业务逻辑使用
  const durationMinutes = roundUp(preparationMinutes + changeoverMinutes + processingMinutes, // 计算并保存 durationMinutes，供后续业务逻辑使用
    engineConfig.minimumTimeBucketMinutes) // 按照引擎配置的最小时间粒度对任务时长取整
  const resourceAvailableAt = new Date(resource.availableAt || earliest) // 计算并保存 resourceAvailableAt，供后续业务逻辑使用
  const slot = findAvailableSlot(resource, new Date(Math.max(new Date(earliest), resourceAvailableAt)), durationMinutes, calendar) // 计算并保存 slot，供后续业务逻辑使用
  const elapsedMinutes = Math.max(0, (slot.end - new Date(earliest)) / 60000) // 计算并保存 elapsedMinutes，供后续业务逻辑使用
  const overdueMinutes = Math.max(0, (slot.end - new Date(workOrder.deadline)) / 60000) // 计算并保存 overdueMinutes，供后续业务逻辑使用
  const calendarCapacity = Number(resource.dailyCapacityMinutes || 480) // 计算并保存 calendarCapacity，供后续业务逻辑使用
  const existingLoadMinutes = (resource.bookings || []).reduce((sum, booking) => // 计算并保存 existingLoadMinutes，供后续业务逻辑使用
    sum + Math.max(0, (new Date(booking.end) - new Date(booking.start)) / 60000), 0) // 累计已有预约占用的生产分钟数
  const loadRate = Math.min(1, existingLoadMinutes / calendarCapacity) // 计算并保存 loadRate，供后续业务逻辑使用
  const weights = engineConfig.weights // 计算并保存 weights，供后续业务逻辑使用
  const score = // 补充当前多行表达式所需的业务参数或计算条件
    normalize(elapsedMinutes, 1440) * weights.completion + // 将完成耗时归一化并计入综合成本
    loadRate * weights.load + // 按照负载权重计入资源当前负载成本
    normalize(changeoverMinutes, 120) * weights.changeover + // 将换型时间归一化并计入换型成本
    normalize(overdueMinutes, 1440) * weights.overdue // 将延期时间归一化并计入交期风险成本

  return { // 组装并返回当前处理阶段的业务结果
    resource, start: slot.start, end: slot.end, batchCount, preparationMinutes, // 补充当前多行表达式所需的业务参数或计算条件
    processingMinutes, changeoverMinutes, loadRate, overdueMinutes, score // 补充当前多行表达式所需的业务参数或计算条件
  } // 结束当前对象或代码块
} // 结束当前对象或代码块

function isEligibleResource(resource, operation, workOrder) { // 定义 isEligibleResource 函数，执行对应的业务处理
  return resource.supportedProducts?.includes(workOrder.productCode) && // 返回当前函数计算或查询得到的结果
    operation.eligibleResourceTypes.includes(resource.resourceType) && // 组合多个业务条件形成完整的判断结果
    Object.prototype.hasOwnProperty.call(resource.operationRates || {}, operation.code) // 组合多个业务条件形成完整的判断结果
} // 结束当前对象或代码块

function resolveChangeoverMinutes(fromProduct, toProduct, matrix = {}) { // 定义 resolveChangeoverMinutes 函数，执行对应的业务处理
  if (!fromProduct || fromProduct === toProduct) return 0 // 判断当前业务条件是否满足，并在必要时执行分支处理
  const exact = matrix[`${fromProduct}->${toProduct}`] // 计算并保存 exact，供后续业务逻辑使用
  const fallback = matrix.default // 计算并保存 fallback，供后续业务逻辑使用
  const value = exact ?? fallback // 计算并保存 value，供后续业务逻辑使用
  if (!Number.isFinite(Number(value)) || Number(value) < 0) { // 判断当前业务条件是否满足，并在必要时执行分支处理
    throw new ValidationError(`缺少 ${fromProduct} 到 ${toProduct} 的有效换型时间`) // 创建并抛出业务异常，终止不合法的处理流程
  } // 结束当前对象或代码块
  return Number(value) // 返回当前函数计算或查询得到的结果
} // 结束当前对象或代码块

function compareCandidates(left, right) { // 定义 compareCandidates 函数，执行对应的业务处理
  return left.score - right.score || left.end - right.end || left.resource.id.localeCompare(right.resource.id) // 返回当前函数计算或查询得到的结果
} // 结束当前对象或代码块

function buildReason(candidate) { // 定义 buildReason 函数，执行对应的业务处理
  const facts = [`综合成本 ${round(candidate.score, 4)}`, `当前负载 ${Math.round(candidate.loadRate * 100)}%`] // 计算并保存 facts，供后续业务逻辑使用
  facts.push(candidate.changeoverMinutes ? `需换型 ${candidate.changeoverMinutes} 分钟` : '无需换型') // 向当前集合追加一条新的业务记录
  if (candidate.overdueMinutes > 0) facts.push(`预计延期 ${Math.ceil(candidate.overdueMinutes)} 分钟`) // 判断当前业务条件是否满足，并在必要时执行分支处理
  return facts.join('；') // 返回当前函数计算或查询得到的结果
} // 结束当前对象或代码块

function validateSchedulingInput(workOrder, route, config, pool) { // 定义 validateSchedulingInput 函数，执行对应的业务处理
  if (!workOrder || !route || !config) throw new ValidationError('排产输入不完整') // 判断当前业务条件是否满足，并在必要时执行分支处理
  if (!route.operations?.length) throw new ValidationError('工艺路线没有可排程工序') // 判断当前业务条件是否满足，并在必要时执行分支处理
  if (!pool?.resources?.length || !pool?.calendars?.length) throw new ValidationError('排产资源或工作日历为空') // 判断当前业务条件是否满足，并在必要时执行分支处理
} // 结束当前对象或代码块

function normalize(value, ceiling) { return Math.min(1, Math.max(0, value / ceiling)) } // 定义 normalize 函数，执行对应的业务处理
function roundUp(value, bucket) { return Math.ceil(value / bucket) * bucket } // 定义 roundUp 函数，执行对应的业务处理
function round(value, digits) { return Number(value.toFixed(digits)) } // 定义 round 函数，执行对应的业务处理

module.exports = { // 导出当前模块的公共接口，供上层代码调用
  generateFiniteCapacitySchedule, // 传递或返回 generateFiniteCapacitySchedule 业务数据
  evaluateResourceCandidate, // 传递或返回 evaluateResourceCandidate 业务数据
  resolveChangeoverMinutes, // 传递或返回 resolveChangeoverMinutes 业务数据
  isEligibleResource // 传递或返回 isEligibleResource 业务数据
} // 结束当前对象或代码块
