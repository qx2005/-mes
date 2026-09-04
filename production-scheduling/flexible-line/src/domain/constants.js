'use strict' // 启用 JavaScript 严格模式，避免使用不安全的语法行为

const ORDER_PRIORITIES = Object.freeze(['normal', 'urgent', 'critical']) // 计算并保存 ORDER_PRIORITIES，供后续业务逻辑使用

const WORK_ORDER_STATUS = Object.freeze({ // 计算并保存 WORK_ORDER_STATUS，供后续业务逻辑使用
  ROUTING_PENDING: 'ROUTING_PENDING', // 设置 ROUTING_PENDING 字段，形成完整的业务数据结构
  SCHEDULING_PENDING: 'SCHEDULING_PENDING', // 设置 SCHEDULING_PENDING 字段，形成完整的业务数据结构
  SCHEDULED: 'SCHEDULED', // 设置 SCHEDULED 字段，形成完整的业务数据结构
  IN_PROGRESS: 'IN_PROGRESS', // 设置 IN_PROGRESS 字段，形成完整的业务数据结构
  COMPLETED: 'COMPLETED' // 设置 COMPLETED 字段，形成完整的业务数据结构
}) // 结束当前函数调用或数据转换结构

const REPORT_STATUS = Object.freeze({ // 计算并保存 REPORT_STATUS，供后续业务逻辑使用
  PENDING: 'PENDING', // 设置 PENDING 字段，形成完整的业务数据结构
  IN_PROGRESS: 'IN_PROGRESS', // 设置 IN_PROGRESS 字段，形成完整的业务数据结构
  COMPLETED: 'COMPLETED' // 设置 COMPLETED 字段，形成完整的业务数据结构
}) // 结束当前函数调用或数据转换结构

module.exports = { ORDER_PRIORITIES, WORK_ORDER_STATUS, REPORT_STATUS } // 导出当前模块的公共接口，供上层代码调用
