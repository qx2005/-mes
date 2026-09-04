'use strict' // 启用 JavaScript 严格模式，避免使用不安全的语法行为

const POLICY_WEIGHTS = Object.freeze({ // 计算并保存 POLICY_WEIGHTS，供后续业务逻辑使用
  balanced: Object.freeze({ completion: 0.25, load: 0.45, changeover: 0.20, overdue: 0.10 }), // 设置 balanced 字段，形成完整的业务数据结构
  delivery: Object.freeze({ completion: 0.30, load: 0.10, changeover: 0.10, overdue: 0.50 }), // 设置 delivery 字段，形成完整的业务数据结构
  changeover: Object.freeze({ completion: 0.20, load: 0.15, changeover: 0.55, overdue: 0.10 }) // 设置 changeover 字段，形成完整的业务数据结构
}) // 结束当前函数调用或数据转换结构

const DEFAULT_CALENDAR_ID = 'CAL-DAY-SHIFT' // 计算并保存 DEFAULT_CALENDAR_ID，供后续业务逻辑使用
const SCHEDULING_DEFAULTS = Object.freeze({ // 计算并保存 SCHEDULING_DEFAULTS，供后续业务逻辑使用
  minimumTimeBucketMinutes: 5, // 设置 minimumTimeBucketMinutes 字段，形成完整的业务数据结构
  overdueAllowedPriorities: Object.freeze(['critical']) // 设置 overdueAllowedPriorities 字段，形成完整的业务数据结构
}) // 结束当前函数调用或数据转换结构

module.exports = { POLICY_WEIGHTS, DEFAULT_CALENDAR_ID, SCHEDULING_DEFAULTS } // 导出当前模块的公共接口，供上层代码调用
