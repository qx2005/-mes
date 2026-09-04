'use strict' // 启用 JavaScript 严格模式，避免使用不安全的语法行为

class DomainError extends Error { // 定义 DomainError 类，封装相关业务能力
  constructor(code, message, details = {}) { // 定义构造函数并接收模块运行所需的依赖
    super(message) // 调用当前业务函数执行对应处理
    this.name = this.constructor.name // 保存 name 依赖，供类中的其他方法共同使用
    this.code = code // 保存 code 依赖，供类中的其他方法共同使用
    this.details = details // 保存 details 依赖，供类中的其他方法共同使用
  } // 结束当前对象或代码块
} // 结束当前对象或代码块

class ValidationError extends DomainError { // 定义 ValidationError 类，封装相关业务能力
  constructor(message, details) { // 定义构造函数并接收模块运行所需的依赖
    super('VALIDATION_ERROR', message, details) // 调用当前业务函数执行对应处理
  } // 结束当前对象或代码块
} // 结束当前对象或代码块

class NotFoundError extends DomainError { // 定义 NotFoundError 类，封装相关业务能力
  constructor(message, details) { // 定义构造函数并接收模块运行所需的依赖
    super('NOT_FOUND', message, details) // 调用当前业务函数执行对应处理
  } // 结束当前对象或代码块
} // 结束当前对象或代码块

class ConflictError extends DomainError { // 定义 ConflictError 类，封装相关业务能力
  constructor(message, details) { // 定义构造函数并接收模块运行所需的依赖
    super('CONFLICT', message, details) // 调用当前业务函数执行对应处理
  } // 结束当前对象或代码块
} // 结束当前对象或代码块

class SchedulingError extends DomainError { // 定义 SchedulingError 类，封装相关业务能力
  constructor(code, message, details) { // 定义构造函数并接收模块运行所需的依赖
    super(code, message, details) // 调用当前业务函数执行对应处理
  } // 结束当前对象或代码块
} // 结束当前对象或代码块

module.exports = { DomainError, ValidationError, NotFoundError, ConflictError, SchedulingError } // 导出当前模块的公共接口，供上层代码调用
