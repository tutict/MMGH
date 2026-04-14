# Release Guide

本项目当前通过 Tauri 生成桌面安装包。本文档整理发版前检查、版本更新点、构建命令、产物位置和交付建议。

## 1. 发版前检查

确认工作区干净：

```bash
git status --short
```

执行完整校验：

```bash
npm run release:check
```

这一步会串行执行：

- `npm run lint`
- `npm run test:unit`
- `npm run build`
- `npm run test:rust`

## 2. 更新版本号

发版前需要同步以下文件中的版本号：

- `package.json`
- `src-tauri/tauri.conf.json`
- `src-tauri/Cargo.toml`

建议同时检查：

- `src-tauri/tauri.conf.json` 中的产品名和描述
- 根 `README.md` 是否仍与当前版本能力一致
- `release/<version>/` 中的元数据是否已经准备好

## 3. 桌面打包

正式构建：

```bash
npm run build:desktop
```

调试构建：

```bash
npm run build:desktop:debug
```

Tauri 会先执行前端构建，再生成桌面分发包。

## 4. 产物位置

正式构建后的桌面产物默认位于：

```text
src-tauri/target/release/bundle/
```

调试构建产物通常位于：

```text
src-tauri/target/debug/
```

具体文件类型取决于当前平台。Windows 下通常重点检查：

- `msi`
- `nsis`

## 5. 建议交付内容

建议将发布材料整理成：

```text
release/
  <version>/
    README.md
    RELEASE_NOTES.md
    SHA256SUMS.txt
```

说明：

- `README.md`: 记录构建 commit、安装包名称、大小和校验步骤
- `RELEASE_NOTES.md`: 面向使用者的更新说明
- `SHA256SUMS.txt`: 安装包校验值

安装包二进制本身不建议提交到仓库，继续保留在 `src-tauri/target/release/bundle/` 即可。

## 6. 冒烟验收清单

打包后至少检查以下路径：

### 核心路径

- 应用可以正常启动
- Today Workspace 正常加载
- Runtime Workspace 可以创建或继续会话
- Knowledge Vault 可以创建、编辑、保存笔记
- Reminder Workspace 可以创建提醒并完成闭环
- Skill Workspace 可以打开并保存技能
- Settings 可以保存 provider 配置

### 安全与配置

- API Key 不会回显到前端快照
- 清空 API Key 后再次打开 Settings，状态正确
- 未配置 provider 时，应用仍可进入本地预览流

### 打包质量

- 产品名显示为 `MMGH Agent Deck`
- 图标正常
- 窗口默认尺寸和标题正常
- 首次安装与覆盖安装都能正常启动

## 7. 发布说明模板

```text
Version: vX.Y.Z
Commit: <git-sha>

Highlights:
- ...
- ...

Checks:
- lint
- unit tests
- rust tests
- desktop build

Known issues:
- ...
```

## 8. 当前推荐流程

1. 完成功能并提交
2. 运行 `npm run release:check`
3. 运行 `npm run build:desktop`
4. 从 `src-tauri/target/release/bundle/` 收集安装包
5. 记录版本号、commit id、更新说明和 SHA256
6. 做一轮桌面冒烟验收
