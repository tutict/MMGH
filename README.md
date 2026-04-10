# MMGH Agent Deck

API key handling notes: [docs/API_KEY_HANDLING.md](docs/API_KEY_HANDLING.md)

一个基于 `Rust + Tauri + React` 的桌面 Agent 工作台。项目已经从早期的工具集合，收敛成一个以会话、知识、提醒、技能和工作区面板为核心的本地 Agent 桌面应用。

## 当前能力

- Agent Workspace
  - 会话列表、消息区、执行轨迹和运行状态整合在一个桌面工作区里。
  - Rust 端负责会话持久化、近期消息读取、执行轨迹写入和模型调用。
  - 浏览器预览模式保留一套本地存储实现，便于纯前端开发。

- Knowledge + Reminder
  - 本地知识笔记可作为稳定上下文参与 Agent 运行。
  - 提醒事项和笔记关联后，会被一起纳入运行时上下文整理。
  - Agent 会在运行前拼装会话标题、挂载技能、相关笔记和未完成提醒。

- Skills
  - 支持自定义 skill 的创建、编辑、启用/禁用、导入/导出和版本历史。
  - 支持通过 `Skill Forge` 用模型或本地回退逻辑生成低权限 skill 草稿。
  - 会话支持挂载 skill；Agent 实际运行时只读取已挂载且已启用的 skill。
  - 会话会根据最近标题和消息内容推荐 skill，并给出可解释的推荐理由。

- Frontend Workspaces
  - Agent、Knowledge、Settings、Skills、Weather、Music、Gallery、Reminder 等页面已经统一到同一套密度和表面语言下。
  - 移动端版式做过压缩和重排，重点页面不再依赖桌面宽度才能成立。
  - Weather 页面增加了基于天气状态、昼夜和温度的氛围动画层。

## 当前边界

- Weather、Music、Gallery 目前仍以前端工作区为主，不是 Rust 侧的真实工具调用。
- Agent 可以感知这些页面在会话中的语义上下文，但不会凭空声明自己读到了实时天气、音频内容或图片像素。
- Skill 是低权限提示能力，不会绕过运行时边界直接获得额外系统权限。

## 目录

- `src/`: React 前端工作区、各类 workspace 组件、样式和多语言文案
- `src-tauri/`: Tauri/Rust 运行时、SQLite 持久化、Agent 调度与命令桥接
- `src-tauri/sql/schema.sql`: SQLite 结构定义

## 开发

安装依赖：

```bash
npm install
```

桌面模式：

```bash
npm run dev:tauri
```

纯前端预览：

```bash
npm run dev:web
```

## 构建与校验

前端构建：

```bash
npm run build
```

Rust 校验：

```bash
cargo check --manifest-path src-tauri/Cargo.toml
```

桌面打包：

```bash
cargo build --manifest-path src-tauri/Cargo.toml
```

## 模型配置

如果要接入真实模型，请在 Settings 页面填写：

- `Base URL`
- `API Key`
- `Model`
- `System Prompt`

当上述配置缺失时：

- 桌面模式会回退到本地预览回答逻辑
- Skill Forge 会回退到本地草稿生成

## 近期实现重点

- 全站页面密度与移动端适配重做
- Weather 页的天气实况动效、昼夜联动和温度联动
- Skill Workspace 的拥挤度整理、推荐区和模板区重构
- 会话级 skill 推荐与推荐理由解释
- Rust 侧运行时上下文拼装
- Skill Forge 的前后端联通与本地回退
