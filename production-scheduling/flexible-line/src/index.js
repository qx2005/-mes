'use strict' // 启用 JavaScript 严格模式，避免使用不安全的语法行为

const { executeImportedOrder } = require('./application/execute-imported-order') // 从其他模块导入当前文件需要的函数或常量
const management = require('./application/production-management-service') // 导入 management 模块，供当前业务逻辑调用
const services = require('./application/production-services') // 导入 services 模块，供当前业务逻辑调用
const scheduling = require('./scheduling/finite-capacity-scheduler') // 导入 scheduling 模块，供当前业务逻辑调用
const domain = { // 计算并保存 domain，供后续业务逻辑使用
  ...require('./domain/constants'), // 展开并汇总当前子模块公开的业务能力
  ...require('./domain/errors'), // 展开并汇总当前子模块公开的业务能力
  ...require('./domain/work-order'), // 展开并汇总当前子模块公开的业务能力
  ...require('./domain/process-route'), // 展开并汇总当前子模块公开的业务能力
  ...require('./domain/reporting-task') // 展开并汇总当前子模块公开的业务能力
} // 结束当前对象或代码块

module.exports = { executeImportedOrder, ...management, ...services, ...scheduling, domain } // 导出当前模块的公共接口，供上层代码调用
