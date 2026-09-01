# BSQ 工业互联网平台运行包（GitHub 精简版）

本仓库为 `bsq_usr` 运行包的 **可版本管理部分**。因 GitHub 单文件 100MB 限制，以下大体积组件 **未纳入 Git**，需本地保留或另行下载：

- `bsq-admin.jar`、`thingsboard.jar`
- `jdk/`、`jdk-21/`
- `mysql/`、`mysql-8.0.30/`、`pgsql/`、`activemq/`、`Redis/`、`minio/`、`tools/`

## 仓库内包含

- 启动 / 停止脚本（`*.bat`）
- MES 前端 `dist_mes/`（工业主题、柔性排产页品类图）
- Nginx 配置 `nginx-1.22.1/`
- 柔性排产移植包 `production-order-portable/`（复用原生产下单执行链路）
- UI 设计参考 `DESIGN.md`
- 项目说明 `项目说明文档.md`

DataEase 已从本运行包移除。

## 本地完整部署

1. 将 Git 克隆目录与原有完整运行包合并（或保留 JAR 与中间件目录）
2. 双击 `一键启动工业互联网平台服务.bat`，等待 3～5 分钟
3. 浏览器访问 `http://127.0.0.1:82`，账号 `user01` / `123456`
4. 停止服务使用 `99停止工业互联网平台服务.bat`

## 远程仓库

https://github.com/qx2005/-mes
