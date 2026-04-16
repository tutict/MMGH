# MMGH Agent Deck

一个面向本地桌面场景的 Agent 工作台，采用 `Rust + Tauri + React` 构建，将会话、知识、提醒、技能和日常任务流整合到统一桌面界面中。项目强调本地持久化、桌面端安全存储和多工作区协同，适合用作个人智能工作台或桌面 AI 助手产品原型。

## 项目概览

- 项目类型：本地桌面端 Agent 工作台
- 业务方向：桌面 AI 助手、知识管理、提醒管理与技能编排
- 主要能力：本地会话上下文管理、知识沉淀、提醒闭环、技能编辑、桌面端安全配置
- 适合阅读对象：HR 初筛、客户端开发、桌面应用、全栈产品与 AI 工具方向面试官

## 核心功能

- Today Workspace：日程队列、会话续接、快速捕获与状态汇总
- Runtime Workspace：主对话线程、执行上下文、技能挂载与交互入口
- Knowledge Vault：本地笔记、提示词、运行手册和产品事实存储
- Reminder Workspace：提醒事项、关联笔记、完成回写和后续动作生成
- Skill Workspace：技能创建、编辑、版本历史、导入导出与技能流程
- Weather / Music / Gallery：辅助工作区与上下文扩展界面

## 承担内容

- 完成桌面 Agent 工作台的产品结构设计与工作区划分
- 完成 React 前端、Tauri 桌面容器和 Rust 本地能力实现
- 完成本地 SQLite 持久化、系统 keyring 密钥存储与提供方配置约束
- 完成 Today / Runtime / Reminder / Skill 等核心工作区页面与数据流
- 完成桌面打包、发布校验和基础测试链路

## 关键技术实现

- 使用 `React 18 + Vite` 构建桌面端前端界面
- 使用 `Tauri 2` 将前端与 Rust 本地能力整合为桌面应用
- 使用 `Rust + rusqlite` 管理本地数据库与命令调用
- 使用系统 `keyring` 保存 API Key，避免将明文密钥写入 SQLite
- 对模型提供方地址实施协议与主机白名单约束
- 在无在线模型配置时提供本地预览回复与草稿回退逻辑
- 支持桌面打包、版本化发布说明和安装产物校验

## 技术栈

| 分层 | 技术方案 |
| --- | --- |
| 前端 | React 18、Vite |
| 桌面容器 | Tauri 2 |
| 本地后端 | Rust、Tauri Command |
| 本地存储 | SQLite、rusqlite |
| 安全存储 | system keyring |
| 模型接入 | OpenAI-compatible provider |
| 测试与质量 | ESLint、Vitest、Cargo Test |

## 仓库结构

```text
MMGH
├─ src/                # React 应用、工作区组件、样式与 i18n
├─ src-tauri/          # Tauri 运行时、Rust 命令、本地数据库
├─ docs/               # 安全、发布与操作文档
├─ release/            # 版本化发布元数据
├─ package.json        # 前端与桌面构建脚本
└─ README.md           # 项目说明
```

## 主要模块说明

### 1. React 前端工作区

负责桌面端主要交互界面和工作区组织。

- 路径：`src/`
- 技术关键词：`React`、`Vite`
- 主要工作区：
  - `Today Workspace`
  - `Runtime Workspace`
  - `Knowledge Vault`
  - `Reminder Workspace`
  - `Skill Workspace`

### 2. Tauri 与 Rust 本地能力

负责桌面运行时、本地命令和持久化能力。

- 路径：`src-tauri/`
- 技术关键词：`Tauri 2`、`Rust`、`rusqlite`
- 主要能力：
  - Tauri runtime
  - Rust commands
  - SQLite persistence
  - 桌面打包与平台构建

### 3. 数据与安全

负责本地状态落盘、配置管理和 API Key 安全约束。

- 路径：`src-tauri/sql/schema.sql`
- 相关说明：
  - API Key 在桌面模式下写入系统 keyring，不写入 SQLite
  - 前端配置快照始终返回空 `apiKey`
  - 远端模型地址默认要求 `https`
  - `http` 仅允许 `localhost` 或内网地址

## 运行说明

### 环境准备

- Node.js 18+
- npm 9+
- Rust stable
- Tauri 2 对应平台构建依赖

### 安装依赖

```bash
npm install
```

### 本地开发

Web 预览：

```bash
npm run dev:web
```

桌面开发：

```bash
npm run dev:tauri
```

## 构建与校验

前端构建：

```bash
npm run build
```

桌面发行构建：

```bash
npm run build:desktop
```

桌面调试构建：

```bash
npm run build:desktop:debug
```

统一校验：

```bash
npm run release:check
```

也可以分别执行：

```bash
npm run lint
npm run test:unit
npm run test:rust
```

## 提供方配置

可在 `Settings` 中配置模型接入信息：

- `Base URL`
- `API Key`
- `Model`
- `System Prompt`

相关安全规则：

- 远端 `Base URL` 默认要求使用 `https`
- `http` 仅允许 `localhost` 或私网地址
- 可通过以下环境变量扩展可信主机：
  - `VITE_TRUSTED_PROVIDER_HOSTS`
  - `MMGH_TRUSTED_PROVIDER_HOSTS`
- 可通过以下环境变量启用严格白名单：
  - `VITE_ENFORCE_TRUSTED_PROVIDER_HOSTS=true`
  - `MMGH_ENFORCE_TRUSTED_PROVIDER_HOSTS=true`

## 产物与文档

桌面构建产物默认位于：

```text
src-tauri/target/release/bundle/
```

Windows 下常见产物包括：

- `msi`
- `nsis`

相关文档：

- API Key 处理说明：[docs/API_KEY_HANDLING.md](docs/API_KEY_HANDLING.md)
- 发布指南：[docs/RELEASE.md](docs/RELEASE.md)
- 变更记录：[CHANGELOG.md](CHANGELOG.md)
- 首个桌面发行版：[release/0.1.0/README.md](release/0.1.0/README.md)

