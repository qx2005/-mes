'use strict' // 启用 JavaScript 严格模式，避免使用不安全的语法行为

const { SchedulingError, ValidationError } = require('../domain/errors') // 从其他模块导入当前文件需要的函数或常量

function alignToWorkingTime(value, calendar) { // 定义 alignToWorkingTime 函数，执行对应的业务处理
  let cursor = new Date(value) // 初始化可变变量 cursor，用于记录计算过程状态
  assertCalendar(calendar) // 调用当前业务函数执行对应处理
  for (let dayOffset = 0; dayOffset < 370; dayOffset += 1) { // 遍历当前数据集合，逐项执行业务处理
    const dateKey = cursor.toISOString().slice(0, 10) // 计算并保存 dateKey，供后续业务逻辑使用
    const day = cursor.getUTCDay() // 计算并保存 day，供后续业务逻辑使用
    if (!calendar.excludedDates?.includes(dateKey)) { // 判断当前业务条件是否满足，并在必要时执行分支处理
      const shifts = calendar.shifts.filter(shift => shift.daysOfWeek.includes(day)) // 计算并保存 shifts，供后续业务逻辑使用
        .map(shift => toInterval(cursor, shift)).sort((a, b) => a.start - b.start) // 将集合中的数据转换为目标业务结构
      for (const shift of shifts) { // 遍历当前数据集合，逐项执行业务处理
        if (cursor <= shift.end) return cursor < shift.start ? shift.start : cursor // 判断当前业务条件是否满足，并在必要时执行分支处理
      } // 结束当前对象或代码块
    } // 结束当前对象或代码块
    cursor = startOfNextUtcDay(cursor) // 更新当前对象属性，使后续计算使用最新业务状态
  } // 结束当前对象或代码块
  throw new SchedulingError('CALENDAR_EXHAUSTED', `日历 ${calendar.id} 在未来一年没有可用班次`) // 创建并抛出业务异常，终止不合法的处理流程
} // 结束当前对象或代码块

function addWorkingMinutes(startValue, minutes, calendar) { // 定义 addWorkingMinutes 函数，执行对应的业务处理
  if (!Number.isFinite(minutes) || minutes < 0) throw new ValidationError('工作分钟数必须是非负数字') // 判断当前业务条件是否满足，并在必要时执行分支处理
  let remaining = minutes // 初始化可变变量 remaining，用于记录计算过程状态
  let cursor = alignToWorkingTime(startValue, calendar) // 初始化可变变量 cursor，用于记录计算过程状态
  while (remaining > 0) { // 在条件满足期间持续执行当前计算过程
    const shift = findContainingShift(cursor, calendar) // 计算并保存 shift，供后续业务逻辑使用
    if (!shift) { // 判断当前业务条件是否满足，并在必要时执行分支处理
      cursor = alignToWorkingTime(new Date(cursor.getTime() + 60000), calendar) // 更新当前对象属性，使后续计算使用最新业务状态
      continue // 传递或返回 continue 业务数据
    } // 结束当前对象或代码块
    const available = Math.floor((shift.end.getTime() - cursor.getTime()) / 60000) // 计算并保存 available，供后续业务逻辑使用
    if (remaining <= available) return new Date(cursor.getTime() + remaining * 60000) // 判断当前业务条件是否满足，并在必要时执行分支处理
    remaining -= available // 补充当前多行表达式所需的业务参数或计算条件
    cursor = alignToWorkingTime(new Date(shift.end.getTime() + 60000), calendar) // 更新当前对象属性，使后续计算使用最新业务状态
  } // 结束当前对象或代码块
  return cursor // 返回当前函数计算或查询得到的结果
} // 结束当前对象或代码块

function findAvailableSlot(resource, earliest, durationMinutes, calendar) { // 定义 findAvailableSlot 函数，执行对应的业务处理
  let start = alignToWorkingTime(earliest, calendar) // 初始化可变变量 start，用于记录计算过程状态
  const bookings = (resource.bookings || []).map(item => ({ // 计算并保存 bookings，供后续业务逻辑使用
    start: new Date(item.start), end: new Date(item.end) // 设置 start 字段，形成完整的业务数据结构
  })).sort((a, b) => a.start - b.start) // 结束当前回调处理并完成集合转换

  for (let attempts = 0; attempts < bookings.length + 2; attempts += 1) { // 遍历当前数据集合，逐项执行业务处理
    const end = addWorkingMinutes(start, durationMinutes, calendar) // 计算并保存 end，供后续业务逻辑使用
    const overlap = bookings.find(item => start < item.end && end > item.start) // 计算并保存 overlap，供后续业务逻辑使用
    if (!overlap) return { start, end } // 判断当前业务条件是否满足，并在必要时执行分支处理
    start = alignToWorkingTime(overlap.end, calendar) // 更新当前对象属性，使后续计算使用最新业务状态
  } // 结束当前对象或代码块
  throw new SchedulingError('NO_TIME_SLOT', `资源 ${resource.id} 无法找到可用时间窗`) // 创建并抛出业务异常，终止不合法的处理流程
} // 结束当前对象或代码块

function findContainingShift(value, calendar) { // 定义 findContainingShift 函数，执行对应的业务处理
  const dateKey = value.toISOString().slice(0, 10) // 计算并保存 dateKey，供后续业务逻辑使用
  if (calendar.excludedDates?.includes(dateKey)) return null // 判断当前业务条件是否满足，并在必要时执行分支处理
  return calendar.shifts.filter(shift => shift.daysOfWeek.includes(value.getUTCDay())) // 返回当前函数计算或查询得到的结果
    .map(shift => toInterval(value, shift)) // 将集合中的数据转换为目标业务结构
    .find(interval => value >= interval.start && value <= interval.end) || null // 查找第一个满足当前条件的数据项
} // 结束当前对象或代码块

function toInterval(date, shift) { // 定义 toInterval 函数，执行对应的业务处理
  const datePart = date.toISOString().slice(0, 10) // 计算并保存 datePart，供后续业务逻辑使用
  return { // 组装并返回当前处理阶段的业务结果
    start: new Date(`${datePart}T${shift.start}:00.000Z`), // 设置 start 字段，形成完整的业务数据结构
    end: new Date(`${datePart}T${shift.end}:00.000Z`) // 设置 end 字段，形成完整的业务数据结构
  } // 结束当前对象或代码块
} // 结束当前对象或代码块

function startOfNextUtcDay(value) { // 定义 startOfNextUtcDay 函数，执行对应的业务处理
  const result = new Date(value) // 计算并保存 result，供后续业务逻辑使用
  result.setUTCHours(24, 0, 0, 0) // 补充当前多行表达式所需的业务参数或计算条件
  return result // 返回当前函数计算或查询得到的结果
} // 结束当前对象或代码块

function assertCalendar(calendar) { // 定义 assertCalendar 函数，执行对应的业务处理
  if (!calendar || !calendar.id || !Array.isArray(calendar.shifts) || !calendar.shifts.length) { // 判断当前业务条件是否满足，并在必要时执行分支处理
    throw new ValidationError('资源必须关联包含班次的工作日历') // 创建并抛出业务异常，终止不合法的处理流程
  } // 结束当前对象或代码块
} // 结束当前对象或代码块

module.exports = { alignToWorkingTime, addWorkingMinutes, findAvailableSlot } // 导出当前模块的公共接口，供上层代码调用
