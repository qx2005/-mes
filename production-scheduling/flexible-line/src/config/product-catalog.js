'use strict' // 启用 JavaScript 严格模式，避免使用不安全的语法行为

const CATEGORY_TWO = Object.freeze({ // 计算并保存 CATEGORY_TWO，供后续业务逻辑使用
  productCode: 'BEER-02', // 设置 productCode 字段，形成完整的业务数据结构
  productName: '品类二', // 设置 productName 字段，形成完整的业务数据结构
  categoryCode: 'CATEGORY-02', // 设置 categoryCode 字段，形成完整的业务数据结构
  categoryName: '啤酒灌装产品', // 设置 categoryName 字段，形成完整的业务数据结构
  unit: 'PCS', // 设置 unit 字段，形成完整的业务数据结构
  routeCode: 'ROUTE-BEER-02', // 设置 routeCode 字段，形成完整的业务数据结构
  version: '1.0', // 设置 version 字段，形成完整的业务数据结构
  operations: Object.freeze([ // 设置 operations 字段，形成完整的业务数据结构
    { // 补充当前多行表达式所需的业务参数或计算条件
      code: 'MAT-010', name: '包材上料', sequence: 10, dependencies: [], // 设置 code 字段，形成完整的业务数据结构
      eligibleResourceTypes: ['MATERIAL_STATION'], preparationMinutes: 10, // 设置 eligibleResourceTypes 字段，形成完整的业务数据结构
      standardBatchSize: 1200, isKeyOperation: false, // 设置 standardBatchSize 字段，形成完整的业务数据结构
      qualityChecks: ['核对包材批次', '确认瓶体与瓶盖规格'] // 设置 qualityChecks 字段，形成完整的业务数据结构
    }, // 结束当前对象或代码块
    { // 补充当前多行表达式所需的业务参数或计算条件
      code: 'FILL-020', name: '定量注酒', sequence: 20, dependencies: ['MAT-010'], // 设置 code 字段，形成完整的业务数据结构
      eligibleResourceTypes: ['FILLING_LINE'], preparationMinutes: 15, // 设置 eligibleResourceTypes 字段，形成完整的业务数据结构
      standardBatchSize: 2400, isKeyOperation: false, // 设置 standardBatchSize 字段，形成完整的业务数据结构
      qualityChecks: ['酒液批次一致', '灌装容量合格'] // 设置 qualityChecks 字段，形成完整的业务数据结构
    }, // 结束当前对象或代码块
    { // 补充当前多行表达式所需的业务参数或计算条件
      code: 'CAP-030', name: '放盖压合', sequence: 30, dependencies: ['FILL-020'], // 设置 code 字段，形成完整的业务数据结构
      eligibleResourceTypes: ['CAPPING_LINE'], preparationMinutes: 8, // 设置 eligibleResourceTypes 字段，形成完整的业务数据结构
      standardBatchSize: 2400, isKeyOperation: false, // 设置 standardBatchSize 字段，形成完整的业务数据结构
      qualityChecks: ['瓶盖定位正确', '密封压力合格'] // 设置 qualityChecks 字段，形成完整的业务数据结构
    }, // 结束当前对象或代码块
    { // 补充当前多行表达式所需的业务参数或计算条件
      code: 'QC-040', name: '在线质检', sequence: 40, dependencies: ['CAP-030'], // 设置 code 字段，形成完整的业务数据结构
      eligibleResourceTypes: ['INSPECTION_LINE'], preparationMinutes: 5, // 设置 eligibleResourceTypes 字段，形成完整的业务数据结构
      standardBatchSize: 600, isKeyOperation: false, // 设置 standardBatchSize 字段，形成完整的业务数据结构
      qualityChecks: ['净含量抽检', '密封性抽检', '外观检查'] // 设置 qualityChecks 字段，形成完整的业务数据结构
    }, // 结束当前对象或代码块
    { // 补充当前多行表达式所需的业务参数或计算条件
      code: 'CODE-050', name: '产品赋码', sequence: 50, dependencies: ['QC-040'], // 设置 code 字段，形成完整的业务数据结构
      eligibleResourceTypes: ['CODING_LINE'], preparationMinutes: 5, // 设置 eligibleResourceTypes 字段，形成完整的业务数据结构
      standardBatchSize: 1200, isKeyOperation: true, // 设置 standardBatchSize 字段，形成完整的业务数据结构
      qualityChecks: ['追溯码唯一', '编码清晰可识读'] // 设置 qualityChecks 字段，形成完整的业务数据结构
    }, // 结束当前对象或代码块
    { // 补充当前多行表达式所需的业务参数或计算条件
      code: 'PACK-060', name: '装箱码垛', sequence: 60, dependencies: ['CODE-050'], // 设置 code 字段，形成完整的业务数据结构
      eligibleResourceTypes: ['PACKING_LINE'], preparationMinutes: 10, // 设置 eligibleResourceTypes 字段，形成完整的业务数据结构
      standardBatchSize: 600, isKeyOperation: false, // 设置 standardBatchSize 字段，形成完整的业务数据结构
      qualityChecks: ['装箱数量正确', '外箱标签匹配'] // 设置 qualityChecks 字段，形成完整的业务数据结构
    }, // 结束当前对象或代码块
    { // 补充当前多行表达式所需的业务参数或计算条件
      code: 'WH-070', name: '成品入库', sequence: 70, dependencies: ['PACK-060'], // 设置 code 字段，形成完整的业务数据结构
      eligibleResourceTypes: ['WAREHOUSE_STATION'], preparationMinutes: 5, // 设置 eligibleResourceTypes 字段，形成完整的业务数据结构
      standardBatchSize: 1200, isKeyOperation: false, // 设置 standardBatchSize 字段，形成完整的业务数据结构
      qualityChecks: ['批次与库位匹配', '入库数量复核'] // 设置 qualityChecks 字段，形成完整的业务数据结构
    } // 结束当前对象或代码块
  ]) // 结束依赖清单并完成运行环境校验
}) // 结束当前函数调用或数据转换结构

const PRODUCT_CATALOG = new Map([[CATEGORY_TWO.productCode, CATEGORY_TWO]]) // 计算并保存 PRODUCT_CATALOG，供后续业务逻辑使用

function findProduct(productCode) { // 定义 findProduct 函数，执行对应的业务处理
  return PRODUCT_CATALOG.get(String(productCode || '').trim().toUpperCase()) || null // 返回当前函数计算或查询得到的结果
} // 结束当前对象或代码块

module.exports = { CATEGORY_TWO, PRODUCT_CATALOG, findProduct } // 导出当前模块的公共接口，供上层代码调用
