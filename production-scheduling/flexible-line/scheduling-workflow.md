# 柔性排产核心流程说明

代码位置：`flexible-scheduler.js` 中的 `resolveProductionSchedule`。

## 现场输入代码

```js
function resolveProductionSchedule(input) {
  const demand = input.demand
  const now = input.now || new Date()
  validateDemand(demand)
  const workorder = input.workorders.find(item => item.productCode === demand.productCode)
  const lines = input.lines.filter(line => line.enabled && line.supportedProducts.includes(demand.productCode) && (demand.lineMode === 'auto' || demand.lineMode === line.id))
  const candidates = lines.map(line => evaluateLine(line, demand, now))
  const best = candidates.sort((left, right) => right.score - left.score || left.endTime - right.endTime)[0]
  if (!workorder || !best) throw new Error('没有可执行的排产方案')
  return { planCode: createPlanCode(now, input.sequence), workorderCode: workorder.code, recommendedLine: best.line.name, matchingScore: best.score }
}
```

## 9 段逐行口播稿

| 时间 | 输入内容 | 讲解 |
|---|---|---|
| 00:00–00:20 | 函数声明和 `demand` | “首先定义柔性排产入口函数，`input` 是页面提交的全部排产数据；这里取出当前品类、数量、交期、优先级和策略。” |
| 00:20–00:40 | `const now = ...` | “获取排产计算时间。优先使用测试时间，没有传入时通过 JavaScript 的 `new Date()` 获取系统当前时间。” |
| 00:40–01:00 | `validateDemand(demand)` | “引用本文件的 `validateDemand` 函数，校验品类、数量、交期和策略，防止错误数据参与排产。” |
| 01:00–01:20 | `workorders.find(...)` | “调用数组的 `find` 函数，用产品编码匹配可执行的生产工单。” |
| 01:20–01:40 | `lines.filter(...)` | “调用 `filter` 筛选产线，再通过 `includes` 检查产线是否支持当前品类，同时兼容智能匹配和人工指定产线。” |
| 01:40–02:00 | `lines.map(...)` | “调用 `map`，并引用 `evaluateLine` 函数，分别计算每条产线的负载、换型时间、预计完成时间、交期风险和得分。” |
| 02:00–02:20 | `candidates.sort(...)[0]` | “调用 `sort`，优先选择得分最高的方案；得分相同时选择完成时间更早的方案，第一项就是推荐产线。” |
| 02:20–02:40 | 异常判断 | “如果工单或最优产线不存在，就通过 `Error` 停止生成，避免出现无法执行的虚假方案。” |
| 02:40–03:00 | `return {...}` | “最后引用 `createPlanCode` 生成方案编号，并返回匹配工单、推荐产线和匹配度，供方案预览界面展示。” |

## 引用的函数

- `new Date()`：获取排产基准时间。
- `validateDemand()`：验证需求参数。
- `find()`：匹配生产工单。
- `filter()`：筛选可用产线。
- `includes()`：检查产线是否支持当前产品。
- `map()`：把产线转换成候选方案。
- `evaluateLine()`：计算负载、换型、交期风险和综合得分。
- `sort()`：选择得分最高、完成最早的方案。
- `createPlanCode()`：生成柔性排产方案编号。

## 收尾话术

“这 9 段代码只负责计算推荐方案；用户确认之后，正式系统才会使用原有接口下发生产任务，因此排产计算和设备执行相互解耦。”
