# MMGH Agent Deck

一个基于 `Rust + Tauri + React` 的桌面 agent 工作台，目标是把原来的小工具项目改造成更接近 OpenClaw 风格的 agent 应用骨架。

## 当前结构

- `src-tauri/`: Rust 运行时，负责会话持久化、执行轨迹、设置管理和 OpenAI 兼容接口调用
- `src/`: React 桌面工作台，包含会话侧栏、消息区、执行轨迹和 provider 设置
- `src-tauri/sql/schema.sql`: SQLite 数据结构

## 开发

```bash
npm install
npm run dev:tauri
```

纯前端预览：

```bash
npm run dev:web
```

## 打包

```bash
npm run build
cargo build --manifest-path src-tauri/Cargo.toml
```

如果要接入真实模型，请在应用右侧设置里填写：

- `Base URL`
- `API Key`
- `Model`
- `System Prompt`
