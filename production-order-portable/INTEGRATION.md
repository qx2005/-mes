# 新项目融合指南（产线可直接运行）

## 方案 A：使用 bridge（推荐）

1. 复制本包到新项目
2. `bridge/.env.example` → `.env`，配置 MySQL 与 MQTT
3. 运行 `scripts/start-bridge.bat`
4. 复制 `src/` 到前端项目并配置路由
5. Nginx 使用 `config/nginx-prod-api.snippet`

## 方案 B：使用 bsq-admin.jar

若新平台已部署原版 jar，只需复制 `src/` 前端，无需 bridge。

## 启动链路

`PUT /mes/pro/protask/{workorderId}` → MQTT `SubTopic1` → `produce=1` → 产线运行

## 验证

`powershell scripts/verify-stack.ps1`
