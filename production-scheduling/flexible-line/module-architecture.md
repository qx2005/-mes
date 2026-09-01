# 柔性排产引擎

这里是与正式运行环境隔离的排产算法源码模块，不会被 `dist_mes`、后端 JAR 或任何启动脚本直接加载。

## 模块能力

`flexible-scheduler.js` 将页面上的以下输入转换为排产方案：

- 期望交付时间
- 订单优先级
- 优化策略
- 产线分配
- 生产品类与计划数量

算法对可用产线进行负载、交付风险和换型成本评分，最后输出匹配工单、推荐产线、预计起止时间、产线负载和匹配度。

## 运行

```powershell
node production-scheduling\flexible-line\workorder-scheduling-runner.js
```

该命令只读取样例数据并在终端打印结果，不连接数据库、不调用 MQTT，也不会启动真实产线。

使用 VS Code 编写代码时，可以直接打开 `production-scheduling.code-workspace`。它只展示当前算法目录，并隐藏二进制文件类型。

需要讲解核心实现时，可直接使用 `scheduling-workflow.md` 中的逐行说明。

## 源码与运行环境

可以将项目结构分成两层：

1. `mysql/`、`pgsql/`、`jdk/`、`*.jar` 等是已经编译好的部署依赖，保证平台可以离线运行。
2. `production-scheduling/` 和平台前端源码目录是可阅读、可编写和可测试的业务代码。

现场演示时只打开本目录，并在编辑器中排除或折叠二进制运行目录，就不会让“运行包”和“代码编写”产生视觉冲突。
