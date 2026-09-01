/**
 * 柔性排产算法模块
 *
 * 这是一个无外部依赖、无文件写入、无网络请求的纯函数模块。
 * 它不直接接入生产接口，可独立测试后再由业务层调用。
 */

const PRIORITY_LABELS = { // 定义订单优先级编码与中文名称的映射表
  normal: '常规', // 将 normal 编码显示为常规订单
  urgent: '加急', // 将 urgent 编码显示为加急订单
  critical: '插单' // 将 critical 编码显示为紧急插单
} // 结束优先级名称映射

const STRATEGY_LABELS = { // 定义排产策略编码与中文名称的映射表
  balanced: '产能均衡优先', // 表示优先平衡各条产线的工作负载
  delivery: '最早交付优先', // 表示优先缩短订单的交付时间
  changeover: '减少换型优先' // 表示优先降低产线清洗与换型损耗
} // 结束排产策略名称映射

const STRATEGY_WEIGHTS = { // 为不同策略配置负载、交付和换型三个评分权重
  balanced: { load: 0.55, delivery: 0.25, changeover: 0.20 }, // 产能均衡策略重点关注产线负载
  delivery: { load: 0.20, delivery: 0.65, changeover: 0.15 }, // 最早交付策略重点关注完成时间
  changeover: { load: 0.20, delivery: 0.20, changeover: 0.60 } // 减少换型策略重点关注换型成本
} // 结束策略权重配置

function clamp(value, min, max) { // 定义数值边界控制函数
  return Math.min(max, Math.max(min, value)) // 将输入值限制在最小值和最大值之间
} // 结束数值边界控制函数

function pad(value) { // 定义日期数字补零函数
  return String(value).padStart(2, '0') // 将个位数字转换为两位字符串
} // 结束日期数字补零函数

function formatDateTime(value) { // 定义排产时间格式化函数
  const date = new Date(value) // 将时间戳或日期字符串转换为 Date 对象
  return ( // 开始拼接页面需要的日期时间字符串
    date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) + // 拼接年、月、日部分
    ' ' + pad(date.getHours()) + ':' + pad(date.getMinutes()) // 拼接小时和分钟部分
  ) // 返回格式为 yyyy-MM-dd HH:mm 的时间字符串
} // 结束排产时间格式化函数

function createPlanCode(now, sequence) { // 定义柔性排产方案编号生成函数
  const date = new Date(now) // 将方案生成时间转换为 Date 对象
  const datePart = date.getFullYear() + pad(date.getMonth() + 1) + pad(date.getDate()) // 生成八位业务日期
  return 'FSP-' + datePart + '-' + String(sequence || 1).padStart(4, '0') // 组合日期和流水号形成方案编号
} // 结束方案编号生成函数

function validateDemand(demand) { // 定义生产需求参数校验函数
  if (!demand.productCode) throw new Error('productCode 不能为空') // 检查需求是否包含产品编码
  if (!Number.isFinite(demand.quantity) || demand.quantity <= 0) { // 检查计划数量是否为有效正数
    throw new Error('quantity 必须是大于 0 的数字') // 数量无效时抛出明确异常
  } // 结束计划数量校验分支
  if (!PRIORITY_LABELS[demand.priority]) throw new Error('不支持的订单优先级') // 检查优先级编码是否存在
  if (!STRATEGY_WEIGHTS[demand.strategy]) throw new Error('不支持的优化策略') // 检查优化策略是否已配置
  if (Number.isNaN(new Date(demand.deadline).getTime())) throw new Error('deadline 格式无效') // 检查交付时间能否正确解析
} // 结束生产需求参数校验函数

/**
 * 评估某一条产线执行当前需求的成本与可行性。
 */
function evaluateLine(line, demand, now) { // 定义单条产线的排产可行性评估函数
  const startTime = Math.max(new Date(now).getTime(), new Date(line.availableAt).getTime()) // 取当前时间和产线可用时间中的较晚值作为开工时间
  const needsChangeover = line.currentProduct !== demand.productCode // 判断产线当前品类与需求品类是否不同
  const changeoverMinutes = needsChangeover ? line.changeoverMinutes : 0 // 需要换型时计入产线配置的换型时间
  const productionMinutes = Math.ceil((demand.quantity / line.unitsPerHour) * 60) // 根据计划数量和每小时产能估算生产分钟数
  const totalMinutes = changeoverMinutes + productionMinutes // 汇总换型时间和实际生产时间
  const endTime = startTime + totalMinutes * 60 * 1000 // 根据开工时间和总时长计算预计完成时间
  const deadlineTime = new Date(demand.deadline).getTime() // 将需求交期转换为可计算的时间戳
  const overdueMinutes = Math.max(0, Math.ceil((endTime - deadlineTime) / 60000)) // 计算超过目标交期的分钟数
  const leadTimeMinutes = Math.max(0, Math.ceil((endTime - new Date(now).getTime()) / 60000)) // 计算从现在到完工的总提前期
  const loadRate = clamp(Math.round((line.bookedMinutes / line.capacityMinutes) * 100), 0, 100) // 计算并限制产线当前负载百分比
  const weights = STRATEGY_WEIGHTS[demand.strategy] // 读取当前优化策略对应的评分权重

  // 三个维度统一转换成 0～100 的惩罚值，再根据策略进行加权。
  const loadPenalty = loadRate // 将产线负载率直接转换为负载惩罚值
  const urgencyFactor = demand.priority === 'critical' ? 1.5 : demand.priority === 'urgent' ? 1.25 : 1 // 根据订单优先级设置交期风险放大系数
  const deliveryPenalty = clamp( // 开始计算交期惩罚值并限制评分范围
    (overdueMinutes > 0 ? 60 + overdueMinutes / 10 : leadTimeMinutes / 5) * urgencyFactor, // 超期时提高惩罚，否则按提前期计算基础惩罚
    0, // 设置交期惩罚值下限为零
    100 // 设置交期惩罚值上限为一百
  ) // 完成交期惩罚值计算
  const changeoverPenalty = needsChangeover ? 75 : 0 // 需要换型时增加固定换型惩罚
  const priorityBonus = demand.priority === 'critical' ? 8 : demand.priority === 'urgent' ? 4 : 0 // 为加急和插单需求增加优先级奖励
  const score = clamp( // 开始计算产线综合匹配得分
    Math.round( // 将综合得分四舍五入为整数
      100 - // 以满分一百分作为评分起点
      loadPenalty * weights.load - // 按策略权重扣除产线负载成本
      deliveryPenalty * weights.delivery - // 按策略权重扣除交付时间成本
      changeoverPenalty * weights.changeover + // 按策略权重扣除换型成本
      priorityBonus // 将订单优先级奖励加入综合得分
    ), // 完成综合得分的加权计算
    0, // 设置综合得分下限为零
    100 // 设置综合得分上限为一百
  ) // 完成产线综合匹配得分计算

  return { // 返回当前产线的完整评估结果
    line, // 返回被评估的产线原始数据
    startTime, // 返回预计开始生产时间戳
    endTime, // 返回预计完成生产时间戳
    totalMinutes, // 返回换型与生产合计时长
    changeoverMinutes, // 返回本次排产需要的换型时长
    loadRate, // 返回产线当前负载率
    overdueMinutes, // 返回预计超过目标交期的分钟数
    score // 返回当前产线的综合匹配得分
  } // 结束单条产线评估结果对象
} // 结束单条产线可行性评估函数

/**
 * 根据需求、可用工单和产线状态生成一份推荐排产方案。
 */
function generateFlexibleSchedule(input) { // 定义完整柔性排产方案生成函数
  const demand = input.demand // 从输入对象中读取当前生产需求
  const now = input.now || new Date() // 优先使用指定时间，否则读取系统当前时间
  validateDemand(demand) // 调用需求校验函数检查排产参数

  const workorder = input.workorders.find(item => item.productCode === demand.productCode) // 按产品编码查找与需求匹配的生产工单
  if (!workorder) throw new Error('没有找到与当前品类匹配的可用工单') // 未匹配到工单时停止生成排产方案

  const compatibleLines = input.lines.filter(line => { // 从全部产线中筛选满足当前需求的候选产线
    const supportsProduct = line.supportedProducts.includes(demand.productCode) // 判断产线能力清单是否包含当前产品
    const matchesManualSelection = demand.lineMode === 'auto' || demand.lineMode === line.id // 判断产线是否符合自动匹配或人工指定条件
    return line.enabled && supportsProduct && matchesManualSelection // 只保留已启用、支持品类且符合分配模式的产线
  }) // 完成候选产线过滤
  if (!compatibleLines.length) throw new Error('没有满足条件的可用产线') // 没有候选产线时终止排产计算

  const candidates = compatibleLines // 以可用产线集合开始生成候选方案
    .map(line => evaluateLine(line, demand, now)) // 调用产线评估函数计算每条产线的成本和得分
    .sort((left, right) => right.score - left.score || left.endTime - right.endTime) // 先按得分降序再按完成时间升序排列

  const best = candidates[0] // 取得排序后得分最高的推荐方案
  const reasons = { // 定义不同优化策略对应的推荐原因
    balanced: '综合比较各产线负载与交付风险，选择当前综合成本最低的产线。', // 描述产能均衡策略的选择依据
    delivery: '优先选择预计完成时间最早的可用产线，以满足目标交期。', // 描述最早交付策略的选择依据
    changeover: '优先复用相同品类的生产节拍，减少清线与换型时间。' // 描述减少换型策略的选择依据
  } // 结束策略推荐原因映射

  return { // 组装并返回页面需要的完整排产方案
    planCode: createPlanCode(now, input.sequence), // 调用编号生成函数创建唯一排产方案编号
    status: best.overdueMinutes === 0 ? '可执行' : '存在交期风险', // 根据超期分钟数判断方案执行状态
    matchingScore: best.score, // 返回推荐产线的综合匹配得分
    productName: demand.productName, // 返回当前排产的产品名称
    quantity: demand.quantity, // 返回当前计划生产数量
    priority: PRIORITY_LABELS[demand.priority], // 将优先级编码转换为中文名称
    strategy: STRATEGY_LABELS[demand.strategy], // 将策略编码转换为中文名称
    workorderCode: workorder.code, // 返回算法匹配到的生产工单编号
    recommendedLine: best.line.name, // 返回综合得分最高的推荐产线名称
    expectedStartTime: formatDateTime(best.startTime), // 格式化并返回预计开始时间
    expectedEndTime: formatDateTime(best.endTime), // 格式化并返回预计完成时间
    estimatedMinutes: best.totalMinutes, // 返回本次任务预计占用的总分钟数
    changeoverMinutes: best.changeoverMinutes, // 返回本次任务预计需要的换型分钟数
    lineLoad: best.loadRate, // 返回推荐产线的当前负载率
    reason: reasons[demand.strategy], // 返回当前策略对应的推荐原因
    alternatives: candidates.slice(1).map(candidate => ({ // 将其余候选产线转换为备选方案列表
      line: candidate.line.name, // 返回备选产线名称
      score: candidate.score, // 返回备选产线综合得分
      endTime: formatDateTime(candidate.endTime) // 格式化并返回备选产线预计完成时间
    })) // 完成备选方案数组构建
  } // 结束完整排产方案对象
} // 结束完整柔性排产方案生成函数


function resolveProductionSchedule(input) { // 定义精简的生产排产解析入口
  const demand = input.demand // 读取页面提交的生产需求
  const now = input.now || new Date() // 确定本次排产计算的基准时间
  validateDemand(demand) // 调用需求校验函数确保输入有效
  const workorder = input.workorders.find(item => item.productCode === demand.productCode) // 调用 find 函数匹配当前产品工单
  const lines = input.lines.filter(line => line.enabled && line.supportedProducts.includes(demand.productCode) && (demand.lineMode === 'auto' || demand.lineMode === line.id)) // 调用 filter 和 includes 函数筛选兼容产线
  const candidates = lines.map(line => evaluateLine(line, demand, now)) // 调用 map 和 evaluateLine 函数生成产线候选方案
  const best = candidates.sort((left, right) => right.score - left.score || left.endTime - right.endTime)[0] // 调用 sort 函数选取得分最高且完成最早的方案
  if (!workorder || !best) throw new Error('没有可执行的排产方案') // 工单或候选方案不存在时抛出异常
  return { planCode: createPlanCode(now, input.sequence), workorderCode: workorder.code, recommendedLine: best.line.name, matchingScore: best.score } // 返回方案编号、工单、推荐产线和匹配度
} // 结束精简生产排产解析函数

module.exports = { // 通过 CommonJS 暴露排产模块的公共函数
  evaluateLine, // 导出单条产线评估函数
  generateFlexibleSchedule, // 导出完整柔性排产方案生成函数
  resolveProductionSchedule // 导出精简生产排产解析函数
} // 结束模块公共接口定义
