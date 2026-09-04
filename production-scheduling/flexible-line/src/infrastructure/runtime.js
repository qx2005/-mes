'use strict' // 启用 JavaScript 严格模式，避免使用不安全的语法行为

const { randomUUID } = require('node:crypto') // 从其他模块导入当前文件需要的函数或常量

class SystemClock { // 定义 SystemClock 类，封装相关业务能力
  now() { return new Date() } // 定义 now 方法，封装当前阶段的处理逻辑
} // 结束当前对象或代码块

class UuidGenerator { // 定义 UuidGenerator 类，封装相关业务能力
  next(prefix) { // 定义 next 方法，封装当前阶段的处理逻辑
    return `${prefix}-${randomUUID().toUpperCase()}` // 返回当前函数计算或查询得到的结果
  } // 结束当前对象或代码块
} // 结束当前对象或代码块

module.exports = { SystemClock, UuidGenerator } // 导出当前模块的公共接口，供上层代码调用
