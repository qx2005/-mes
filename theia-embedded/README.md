# MES Embedded Theia

精简版 Eclipse Theia 1.75.0 浏览器 IDE，固定监听 `127.0.0.1:3188`，工作区直接打开当前 MES 项目根目录。

```bat
npm install
npm run build
npm start
```

服务启动后访问 <http://127.0.0.1:3188>。IDE 可直接编辑项目文件；未集成终端、调试、Git、任务、扩展市场和真实部署能力，平台中的热部署仍为模拟演示。
