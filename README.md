# It means make my grilfriend happy
给未来对象写的小项目（React + Ionic + Tauri）

## 架构
- 默认桌面：Ionic/React 前端 + Tauri（Rust）后端
- 备用方案：Ionic 前端 + Rust 本地 HTTP 后端（`mygh-ionic`）

## 开发方式
桌面（Tauri）：
```
npm run dev:tauri
```

Ionic + Rust 后端（备用）：
```
npm run dev:ionic-backend
npm run dev:ionic
```

`.env.ionic` 已内置本地后端地址（默认 `http://127.0.0.1:4781`）。

