'use strict' // 启用 JavaScript 严格模式，避免使用不安全的语法行为

module.exports = { // 导出当前模块的公共接口，供上层代码调用
  ...require('./order-service'), // 展开并汇总当前子模块公开的业务能力
  ...require('./work-order-service'), // 展开并汇总当前子模块公开的业务能力
  ...require('./operation-service'), // 展开并汇总当前子模块公开的业务能力
  ...require('./route-service'), // 展开并汇总当前子模块公开的业务能力
  ...require('./engine-service'), // 展开并汇总当前子模块公开的业务能力
  ...require('./scheduling-service'), // 展开并汇总当前子模块公开的业务能力
  ...require('./reporting-service') // 展开并汇总当前子模块公开的业务能力
} // 结束当前对象或代码块
