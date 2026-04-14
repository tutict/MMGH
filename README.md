# MMGH Agent Deck

MMGH Agent Deck 是一个基于 `Rust + Tauri + React` 的本地 Agent 桌面工作台。项目围绕会话、知识、提醒、技能和多个辅助工作区组织，目标是把“对话 + 上下文 + 可执行后续”收在同一个桌面产品里。

相关文档：

- API Key 安全说明：[docs/API_KEY_HANDLING.md](docs/API_KEY_HANDLING.md)
- 发布与打包说明：[docs/RELEASE.md](docs/RELEASE.md)

## 产品概览

- Today Workspace：把今日待办、会话续接、闭环信号和最近沉淀集中到一个入口。
- Runtime Workspace：负责会话执行、消息线程、挂载技能、推荐技能和快速沉淀。
- Knowledge Vault：本地知识页，用来保存稳定事实、提示词、运行笔记和产品上下文。
- Reminder Workspace：提醒项支持状态流转、关联笔记、完成回写和后续提醒。
- Skill Workspace：支持技能创建、编辑、启停、导入导出、版本历史和 Skill Forge 草拟。
- Weather / Music / Gallery：作为辅助工作区提供环境信息和媒体能力，不伪装成真实系统工具调用。

## 当前边界

- Agent 的真实执行核心仍然聚焦在会话、技能、提醒和知识上下文。
- Weather、Music、Gallery 主要是前端工作区，不代表 Agent 已直接读取真实设备状态或媒体内容。
- Skill 是低权限提示能力，不绕过运行时边界，不直接授予额外系统权限。

## 技术栈

- 前端：React 18 + Vite
- 桌面运行时：Tauri 2
- 后端：Rust
- 本地存储：SQLite + 系统 keyring
- 模型接入：OpenAI-compatible provider

## 目录结构

- `src/`: React 前端、工作区组件、样式、多语言文案
- `src/components/`: 各工作区 UI 组件
- `src/storage/`: 预览模式和桌面模式共享的数据访问层
- `src/utils/`: Today/Runtime 等工作流逻辑与派生数据
- `src-tauri/`: Tauri/Rust 运行时、命令桥接、SQLite 持久化
- `src-tauri/sql/schema.sql`: SQLite 结构定义
- `docs/`: 安全和发布文档

## 开发环境

建议环境：

- Node.js 18+
- npm 9+
- Rust stable
- Tauri 2 构建依赖

安装依赖：

```bash
npm install
```

## 本地开发

纯前端预览：

```bash
npm run dev:web
```

桌面开发模式：

```bash
npm run dev:tauri
```

## 构建与验证

前端构建：

```bash
npm run build
```

桌面发布构建：

```bash
npm run build:desktop
```

桌面调试构建：

```bash
npm run build:desktop:debug
```

完整发布前校验：

```bash
npm run release:check
```

也可以分别执行：

```bash
npm run lint
npm run test:unit
npm run test:rust
```

## 发布产物

桌面打包完成后，Tauri 产物默认位于：

```text
src-tauri/target/release/bundle/
```

常见产物取决于当前平台和工具链，Windows 下通常会看到安装包或可分发目录。

## 模型配置

如需接入真实模型，请在 Settings 页面填写：

- `Base URL`
- `API Key`
- `Model`
- `System Prompt`

Provider 安全边界：

- 远程 `Base URL` 默认要求 `https`
- `http` 仅允许 `localhost` 或私有网段
- 可通过 `VITE_TRUSTED_PROVIDER_HOSTS` 和 `MMGH_TRUSTED_PROVIDER_HOSTS` 配置受信任域名
- 若要强制只允许白名单域名，可额外设置：
  - `VITE_ENFORCE_TRUSTED_PROVIDER_HOSTS=true`
  - `MMGH_ENFORCE_TRUSTED_PROVIDER_HOSTS=true`

未配置模型时：

- 桌面模式会退回本地预览回复逻辑
- Skill Forge 会退回本地草稿生成

## API Key 处理

项目当前对 API Key 的处理原则：

- 浏览器预览模式不把明文 API Key 持久化到 `localStorage`
- Tauri 桌面模式把 API Key 存在系统 keyring，而不是 SQLite
- 前端收到的设置快照中，`apiKey` 始终为空字符串，是否已配置通过 `hasApiKey` 表达

详细说明见：[docs/API_KEY_HANDLING.md](docs/API_KEY_HANDLING.md)

## 发布建议

正式发版前建议至少完成：

1. 更新版本号
2. 运行 `npm run release:check`
3. 运行 `npm run build:desktop`
4. 检查安装包、首屏、Settings、Today、Runtime、Knowledge、Reminder 主路径

更完整的步骤见：[docs/RELEASE.md](docs/RELEASE.md)
