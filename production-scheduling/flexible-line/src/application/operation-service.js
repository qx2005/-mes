'use strict' // 启用 JavaScript 严格模式，避免使用不安全的语法行为

const { NotFoundError } = require('../domain/errors') // 从其他模块导入当前文件需要的函数或常量
const { findProduct } = require('../config/product-catalog') // 从其他模块导入当前文件需要的函数或常量

function configureWorkOrderOperations(workOrder, clock) { // 定义 configureWorkOrderOperations 函数，执行对应的业务处理
  const product = findProduct(workOrder.productCode) // 计算并保存 product，供后续业务逻辑使用
  if (!product) throw new NotFoundError(`产品 ${workOrder.productCode} 没有工序模板`) // 判断当前业务条件是否满足，并在必要时执行分支处理

  const operations = product.operations.map(operation => Object.freeze({ // 计算并保存 operations，供后续业务逻辑使用
    ...operation, // 展开原有对象字段并保留已有业务数据
    dependencies: Object.freeze([...(operation.dependencies || [])]), // 设置 dependencies 字段，形成完整的业务数据结构
    eligibleResourceTypes: Object.freeze([...operation.eligibleResourceTypes]), // 设置 eligibleResourceTypes 字段，形成完整的业务数据结构
    qualityChecks: Object.freeze([...(operation.qualityChecks || [])]) // 设置 qualityChecks 字段，形成完整的业务数据结构
  })) // 结束当前函数调用或数据转换结构
  return Object.freeze({ // 返回冻结后的业务对象，防止结果被外部意外修改
    workOrderId: workOrder.id, // 设置 workOrderId 字段，形成完整的业务数据结构
    productCode: workOrder.productCode, // 设置 productCode 字段，形成完整的业务数据结构
    routeCode: product.routeCode, // 设置 routeCode 字段，形成完整的业务数据结构
    version: product.version, // 设置 version 字段，形成完整的业务数据结构
    operations: Object.freeze(operations), // 设置 operations 字段，形成完整的业务数据结构
    configuredAt: clock.now().toISOString() // 设置 configuredAt 字段，形成完整的业务数据结构
  }) // 结束当前函数调用或数据转换结构
} // 结束当前对象或代码块

module.exports = { configureWorkOrderOperations } // 导出当前模块的公共接口，供上层代码调用
