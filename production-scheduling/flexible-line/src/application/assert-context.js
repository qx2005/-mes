'use strict' // 启用 JavaScript 严格模式，避免使用不安全的语法行为

const { ValidationError } = require('../domain/errors') // 从其他模块导入当前文件需要的函数或常量

function assertContext(context, dependencies) { // 定义 assertContext 函数，执行对应的业务处理
  for (const dependency of dependencies) { // 遍历当前数据集合，逐项执行业务处理
    if (!context?.[dependency]) throw new ValidationError(`缺少运行依赖: ${dependency}`) // 判断当前业务条件是否满足，并在必要时执行分支处理
  } // 结束当前对象或代码块
} // 结束当前对象或代码块

module.exports = { assertContext } // 导出当前模块的公共接口，供上层代码调用
