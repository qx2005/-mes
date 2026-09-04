'use strict' // 启用 JavaScript 严格模式，避免使用不安全的语法行为

const { importOrder } = require('./order-service') // 从其他模块导入当前文件需要的函数或常量
const { createWorkOrder } = require('./work-order-service') // 从其他模块导入当前文件需要的函数或常量
const { configureWorkOrderOperations } = require('./operation-service') // 从其他模块导入当前文件需要的函数或常量
const { planRoute } = require('./route-service') // 从其他模块导入当前文件需要的函数或常量
const { configureEngine } = require('./engine-service') // 从其他模块导入当前文件需要的函数或常量
const { generateSchedule } = require('./scheduling-service') // 从其他模块导入当前文件需要的函数或常量
const { initializeReporting } = require('./reporting-service') // 从其他模块导入当前文件需要的函数或常量
const { assertContext } = require('./assert-context') // 从其他模块导入当前文件需要的函数或常量

class ProductionManagementService { // 定义 ProductionManagementService 类，封装相关业务能力
  constructor(context) { // 定义构造函数并接收模块运行所需的依赖
    assertContext(context, [ // 校验当前服务所需的仓储、时钟和编号器是否已经注入
      'orderRepository', 'workOrderRepository', 'routeRepository', // 声明当前模块需要使用的业务依赖或配置项
      'resourceRepository', 'scheduleRepository', 'reportingRepository', // 声明当前模块需要使用的业务依赖或配置项
      'clock', 'idGenerator' // 声明当前模块需要使用的业务依赖或配置项
    ]) // 结束依赖清单并完成运行环境校验
    this.context = context // 保存 context 依赖，供类中的其他方法共同使用
  } // 结束当前对象或代码块

  async createProductionWorkOrder(importedOrder) { // 定义 createProductionWorkOrder 方法，封装当前阶段的处理逻辑
    const imported = await importOrder(importedOrder, this.context) // 异步获取 imported 数据，等待仓储或服务调用完成
    const workOrder = await createWorkOrder(imported.order, this.context) // 异步获取 workOrder 数据，等待仓储或服务调用完成
    return { order: imported.order, workOrder: workOrder.workOrder, created: { order: imported.created, workOrder: workOrder.created } } // 组装并返回当前处理阶段的业务结果
  } // 结束当前对象或代码块

  configureWorkOrderOperations(workOrder) { // 定义 configureWorkOrderOperations 方法，封装当前阶段的处理逻辑
    return configureWorkOrderOperations(workOrder, this.context.clock) // 返回当前函数计算或查询得到的结果
  } // 结束当前对象或代码块

  async planWorkOrderRoute(workOrder, operationPlan) { // 定义 planWorkOrderRoute 方法，封装当前阶段的处理逻辑
    return planRoute(workOrder, operationPlan, this.context) // 返回当前函数计算或查询得到的结果
  } // 结束当前对象或代码块

  async scheduleWorkOrder(workOrder, route) { // 定义 scheduleWorkOrder 方法，封装当前阶段的处理逻辑
    const resourcePool = await this.context.resourceRepository.listSchedulable() // 异步获取 resourcePool 数据，等待仓储或服务调用完成
    const engineDecision = configureEngine(workOrder, resourcePool, this.context.clock) // 计算并保存 engineDecision，供后续业务逻辑使用
    const scheduled = await generateSchedule(workOrder, route, engineDecision, resourcePool, this.context) // 异步获取 scheduled 数据，等待仓储或服务调用完成
    return { ...scheduled, engineDecision } // 组装并返回当前处理阶段的业务结果
  } // 结束当前对象或代码块

  async initializeWorkReporting(workOrder, schedulePlan) { // 定义 initializeWorkReporting 方法，封装当前阶段的处理逻辑
    return initializeReporting(workOrder, schedulePlan, this.context) // 返回当前函数计算或查询得到的结果
  } // 结束当前对象或代码块

  async execute(importedOrder) { // 定义 execute 方法，封装当前阶段的处理逻辑
    const production = await this.createProductionWorkOrder(importedOrder) // 异步获取 production 数据，等待仓储或服务调用完成
    const operationPlan = this.configureWorkOrderOperations(production.workOrder) // 计算并保存 operationPlan，供后续业务逻辑使用
    const routed = await this.planWorkOrderRoute(production.workOrder, operationPlan) // 异步获取 routed 数据，等待仓储或服务调用完成
    const scheduled = await this.scheduleWorkOrder(routed.workOrder, routed.route) // 异步获取 scheduled 数据，等待仓储或服务调用完成
    const reporting = await this.initializeWorkReporting(scheduled.workOrder, scheduled.schedulePlan) // 异步获取 reporting 数据，等待仓储或服务调用完成
    const auditTrail = createAuditTrail( // 计算并保存 auditTrail，供后续业务逻辑使用
      { production, operationPlan, routed, scheduled, reporting }, this.context.clock) // 补充当前多行表达式所需的业务参数或计算条件

    return Object.freeze({ // 返回冻结后的业务对象，防止结果被外部意外修改
      order: production.order, // 设置 order 字段，形成完整的业务数据结构
      workOrder: scheduled.workOrder, // 设置 workOrder 字段，形成完整的业务数据结构
      operationPlan, // 传递或返回 operationPlan 业务数据
      route: routed.route, // 设置 route 字段，形成完整的业务数据结构
      engineDecision: scheduled.engineDecision, // 设置 engineDecision 字段，形成完整的业务数据结构
      schedulePlan: scheduled.schedulePlan, // 设置 schedulePlan 字段，形成完整的业务数据结构
      reportingTasks: reporting.reportingTasks, // 设置 reportingTasks 字段，形成完整的业务数据结构
      auditTrail // 传递或返回 auditTrail 业务数据
    }) // 结束当前函数调用或数据转换结构
  } // 结束当前对象或代码块
} // 结束当前对象或代码块

function createAuditTrail(result, clock) { // 定义 createAuditTrail 函数，执行对应的业务处理
  const { production, operationPlan, routed, scheduled, reporting } = result // 补充当前多行表达式所需的业务参数或计算条件
  const entries = [ // 计算并保存 entries，供后续业务逻辑使用
    ['ORDER_IMPORTED', production.order, production.created.order], // 配置当前枚举、状态或集合项
    ['WORK_ORDER_CREATED', production.workOrder, production.created.workOrder], // 配置当前枚举、状态或集合项
    ['OPERATIONS_CONFIGURED', operationPlan, 'CALCULATED'], // 配置当前枚举、状态或集合项
    ['ROUTE_PLANNED', routed.route, routed.created], // 配置当前枚举、状态或集合项
    ['ENGINE_CONFIGURED', { id: scheduled.engineDecision.engine }, 'CALCULATED'], // 配置当前枚举、状态或集合项
    ['SCHEDULE_GENERATED', scheduled.schedulePlan, scheduled.created], // 配置当前枚举、状态或集合项
    ['REPORTING_INITIALIZED', reporting.reportingTasks[0], reporting.created] // 配置当前枚举、状态或集合项
  ] // 结束当前数组配置
  return entries.map(([stage, entity, outcome]) => ({ // 返回当前函数计算或查询得到的结果
    stage, // 传递或返回 stage 业务数据
    action: typeof outcome === 'string' ? outcome : outcome ? 'CREATED' : 'REUSED', // 设置 action 字段，形成完整的业务数据结构
    entityId: entity.id || entity.workOrderId, // 设置 entityId 字段，形成完整的业务数据结构
    occurredAt: clock.now().toISOString() // 设置 occurredAt 字段，形成完整的业务数据结构
  })) // 结束当前函数调用或数据转换结构
} // 结束当前对象或代码块

function createProductionManagement(context) { // 定义 createProductionManagement 函数，执行对应的业务处理
  return new ProductionManagementService(context) // 返回当前函数计算或查询得到的结果
} // 结束当前对象或代码块

module.exports = { ProductionManagementService, createProductionManagement } // 导出当前模块的公共接口，供上层代码调用
