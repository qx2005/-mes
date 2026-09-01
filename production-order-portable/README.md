# 柔性排产 + 产线启动（全栈可移植包）

本包包含 **柔性排产前端 UI**、**MQTT 产线启动桥接服务 bridge**\ 与部署配置。融合到新平台后，按 **INTEGRATION.md** 启动依赖，即可「录入需求 → 匹配工单 → 确认方案 → 产线运行」。底层仍复用原生产下单接口，不改变实际执行链路。

## 核心文件

| 目录 | 作用 |
|------|------|
| `src/` | Vue2 柔性排产页（生产下单内核） |
| `bridge/` | 后端 API + MQTT 产线启动（与 bsq-admin 报文一致） |
| `config/` | MQTT / Nginx 配置片段 |
| `scripts/start-bridge.bat` | 一键启动桥接 |
| `INTEGRATION.md` | 新项目融合步骤（必读） |

## 快速启动

1. ActiveMQ MQTT `:1893`
2. ThingsBoard 订阅 `SubTopic1`
3. `scripts\\start-bridge.bat`
4. 前端 `/prod-api/` → `:8080`
5. 点「确认排产并下发」启动产线
