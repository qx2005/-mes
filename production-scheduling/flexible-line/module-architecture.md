# 生产管理领域核心

本目录是一套独立的生产管理领域源码。它与 `dist_mes`、数据库、后端 JAR 和设备接口保持边界隔离，核心流程使用业务规则和有限产能算法，不依赖页面状态。

## 业务链路

```text
导入订单
  → 产品目录识别品类二
  → 创建生产工单
  → 套用并校验工艺模板
  → 选择排产策略和参数
  → 按工序执行有限产能排程
  → 生成待报工任务
```

系统启动时调用 `createProductionManagement(context)` 注入仓储、资源、时钟和编号器；业务入口 `productionManagement.execute(importedOrder)` 只接收外部订单。同一订单编号重复执行时，会复用已有订单、工单、路线、方案和报工任务。

## 分层结构

| 目录 | 职责 |
|---|---|
| `src/domain` | 订单、工单状态机、工艺图、报工规则及领域错误 |
| `src/application` | 按用例组织订单导入、工单、工艺、引擎、排产和报工服务 |
| `src/scheduling` | 工作日历、时间窗搜索、产能计算、换型成本和候选资源评分 |
| `src/config` | 产品工艺模板与排产策略；当前完整配置为 `BEER-02` 品类二 |
| `src/ports` | 数据访问端口，规定接入正式数据库或 API 时需要实现的契约 |
| `src/infrastructure` | 系统时钟和 UUID 编号生成基础设施 |

依赖方向固定为：应用层依赖领域层和端口，基础设施实现技术能力；领域层不依赖外部系统。

## 排产计算

求解器以工艺路线中的每道工序为最小任务，执行以下计算：

1. 根据产品、工序能力、资源类型和启用状态筛选候选资源。
2. 取得前置工序完成时间、资源最早可用时间和已有预约时间窗。
3. 按标准批量计算批次数，并累计准备时间。
4. 根据资源工序产能计算加工时长，根据产品切换矩阵计算换型时长。
5. 将任务放入工作日历允许的班次，并避开已有资源预约。
6. 按完成时间、负载、换型和延期权重计算成本，选取确定性的最优候选。
7. 最终方案超过交期且参数不允许延期时，抛出 `DEADLINE_UNACHIEVABLE`，不生成假方案。

排产方案保存完整参数快照和每道工序的选择原因，便于复核当时为何选择某一资源。

## 公共接口

```js
const {
  createProductionManagement,
  importOrder,
  createWorkOrder,
  configureWorkOrderOperations,
  planRoute,
  configureEngine,
  generateSchedule,
  initializeReporting
} = require('./src')

const productionManagement = createProductionManagement(systemContext)
const result = await productionManagement.execute(importedOrder)
```

`context` 只在系统启动阶段注入订单、工单、工艺、资源、方案和报工仓储，以及 `clock` 和 `idGenerator`。订单进入业务流程后，工序、工艺、引擎、参数、排产和报工均从工单自动推导。应用服务以异步方式调用仓储端口，接入 MySQL、HTTP API 或消息系统时只需替换端口实现。

## 集成约定

模块没有第三方运行依赖。业务时间统一使用 ISO 8601 UTC 格式；接入现场系统时，外围适配器负责把工厂时区转换为明确的 ISO 时间。仓储实现必须保证外部订单编号唯一，并在同一事务中保存工单状态、工艺路线、排产方案和报工任务。

## 扩展产品

新增产品时，在 `src/config/product-catalog.js` 中增加产品档案和版本化工艺模板，并注册到 `PRODUCT_CATALOG`。模板必须声明工序编码、依赖、资源类型、准备时间、标准批量、关键工序和质量检查项。应用服务和求解器不应复制或增加产品专用分支。

## 推荐代码阅读顺序

1. 从 `product-catalog.js` 说明品类二工序与资源约束。
2. 从 `production-order.js` 和 `work-order.js` 说明导入校验与工单状态机。
3. 从 `process-route.js` 说明工艺图校验和拓扑排序。
4. 从 `production-management-service.js` 说明五个二级菜单如何由一个工单自动串联。
5. 从 `engine-service.js` 说明策略自动选择与参数快照。
6. 从 `finite-capacity-scheduler.js` 说明产能、班次、换型和评分计算。
7. 从 `src/index.js` 说明生产管理模块向上层系统提供的公共能力。
