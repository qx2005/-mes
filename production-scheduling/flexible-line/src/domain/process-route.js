'use strict' // 启用 JavaScript 严格模式，避免使用不安全的语法行为

const { ValidationError } = require('./errors') // 从其他模块导入当前文件需要的函数或常量

function planProcessRoute(workOrder, productTemplate, clock, idGenerator) { // 定义 planProcessRoute 函数，执行对应的业务处理
  const operations = productTemplate.operations.map(operation => ({ // 计算并保存 operations，供后续业务逻辑使用
    ...operation, // 展开原有对象字段并保留已有业务数据
    dependencies: [...(operation.dependencies || [])], // 设置 dependencies 字段，形成完整的业务数据结构
    eligibleResourceTypes: [...operation.eligibleResourceTypes], // 设置 eligibleResourceTypes 字段，形成完整的业务数据结构
    qualityChecks: [...(operation.qualityChecks || [])] // 设置 qualityChecks 字段，形成完整的业务数据结构
  })) // 结束当前函数调用或数据转换结构
  const codes = operations.map(item => item.code) // 计算并保存 codes，供后续业务逻辑使用
  if (new Set(codes).size !== codes.length) throw new ValidationError('工艺模板中存在重复工序编码') // 判断当前业务条件是否满足，并在必要时执行分支处理

  const codeSet = new Set(codes) // 计算并保存 codeSet，供后续业务逻辑使用
  for (const operation of operations) { // 遍历当前数据集合，逐项执行业务处理
    for (const dependency of operation.dependencies) { // 遍历当前数据集合，逐项执行业务处理
      if (!codeSet.has(dependency)) { // 判断当前业务条件是否满足，并在必要时执行分支处理
        throw new ValidationError(`工序 ${operation.code} 引用了不存在的前置工序 ${dependency}`) // 创建并抛出业务异常，终止不合法的处理流程
      } // 结束当前对象或代码块
    } // 结束当前对象或代码块
  } // 结束当前对象或代码块
  const keyOperations = operations.filter(item => item.isKeyOperation) // 计算并保存 keyOperations，供后续业务逻辑使用
  if (keyOperations.length !== 1) throw new ValidationError('每条工艺路线必须且只能有一道关键工序') // 判断当前业务条件是否满足，并在必要时执行分支处理

  const orderedOperations = topologicalSort(operations) // 计算并保存 orderedOperations，供后续业务逻辑使用
  return Object.freeze({ // 返回冻结后的业务对象，防止结果被外部意外修改
    id: idGenerator.next('ROUTE'), // 设置 id 字段，形成完整的业务数据结构
    code: `${productTemplate.routeCode}-${workOrder.id}`, // 设置 code 字段，形成完整的业务数据结构
    workOrderId: workOrder.id, // 设置 workOrderId 字段，形成完整的业务数据结构
    productCode: workOrder.productCode, // 设置 productCode 字段，形成完整的业务数据结构
    version: productTemplate.version, // 设置 version 字段，形成完整的业务数据结构
    operations: orderedOperations, // 设置 operations 字段，形成完整的业务数据结构
    createdAt: clock.now().toISOString() // 设置 createdAt 字段，形成完整的业务数据结构
  }) // 结束当前函数调用或数据转换结构
} // 结束当前对象或代码块

function topologicalSort(operations) { // 定义 topologicalSort 函数，执行对应的业务处理
  const byCode = new Map(operations.map(item => [item.code, item])) // 计算并保存 byCode，供后续业务逻辑使用
  const indegree = new Map(operations.map(item => [item.code, item.dependencies.length])) // 计算并保存 indegree，供后续业务逻辑使用
  const followers = new Map(operations.map(item => [item.code, []])) // 计算并保存 followers，供后续业务逻辑使用
  for (const operation of operations) { // 遍历当前数据集合，逐项执行业务处理
    for (const dependency of operation.dependencies) followers.get(dependency).push(operation.code) // 遍历当前数据集合，逐项执行业务处理
  } // 结束当前对象或代码块

  const ready = operations.filter(item => indegree.get(item.code) === 0) // 计算并保存 ready，供后续业务逻辑使用
    .sort((left, right) => left.sequence - right.sequence) // 按照既定规则对候选结果进行排序
  const result = [] // 计算并保存 result，供后续业务逻辑使用
  while (ready.length) { // 在条件满足期间持续执行当前计算过程
    const current = ready.shift() // 计算并保存 current，供后续业务逻辑使用
    result.push(current) // 向当前集合追加一条新的业务记录
    for (const followerCode of followers.get(current.code)) { // 遍历当前数据集合，逐项执行业务处理
      indegree.set(followerCode, indegree.get(followerCode) - 1) // 将当前键值写入映射表，供后续工序查询
      if (indegree.get(followerCode) === 0) { // 判断当前业务条件是否满足，并在必要时执行分支处理
        ready.push(byCode.get(followerCode)) // 向当前集合追加一条新的业务记录
        ready.sort((left, right) => left.sequence - right.sequence) // 补充当前多行表达式所需的业务参数或计算条件
      } // 结束当前对象或代码块
    } // 结束当前对象或代码块
  } // 结束当前对象或代码块
  if (result.length !== operations.length) throw new ValidationError('工艺路线存在循环依赖，无法生成执行顺序') // 判断当前业务条件是否满足，并在必要时执行分支处理
  return result // 返回当前函数计算或查询得到的结果
} // 结束当前对象或代码块

module.exports = { planProcessRoute, topologicalSort } // 导出当前模块的公共接口，供上层代码调用
