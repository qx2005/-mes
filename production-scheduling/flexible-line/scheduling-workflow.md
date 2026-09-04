# 核心执行链索引

原文件只说明单条产线评分函数，已不适用于当前生产管理模块。完整架构和讲解顺序统一维护在 `module-architecture.md`。

核心代码入口：

- 完整业务编排：`src/application/execute-imported-order.js`
- 生产管理门面：`src/application/production-management-service.js`
- 工序自动配置：`src/application/operation-service.js`
- 产品与工艺模板：`src/config/product-catalog.js`
- 工艺依赖校验：`src/domain/process-route.js`
- 排产引擎配置：`src/application/engine-service.js`
- 有限产能求解：`src/scheduling/finite-capacity-scheduler.js`
- 班次时间计算：`src/scheduling/working-calendar.js`
- 对外模块入口：`src/index.js`
