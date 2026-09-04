'use strict' // 启用 JavaScript 严格模式，避免使用不安全的语法行为

const { createProductionManagement } = require('./production-management-service') // 从其他模块导入当前文件需要的函数或常量

async function executeImportedOrder(importedOrder, context) { // 定义 executeImportedOrder 函数，执行对应的业务处理
  return createProductionManagement(context).execute(importedOrder) // 返回当前函数计算或查询得到的结果
} // 结束当前对象或代码块

module.exports = { executeImportedOrder } // 导出当前模块的公共接口，供上层代码调用
