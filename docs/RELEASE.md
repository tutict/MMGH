# Release Guide

本项目当前的桌面发布目标是 Tauri 打包产物。本文档整理了发版前检查、版本更新点、构建命令和交付物整理方式。

## 1. 发版前检查

先确认工作区干净：

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

当前版本信息分散在以下文件中，发版前需要保持一致：

- `package.json`
- `src-tauri/tauri.conf.json`
- `src-tauri/Cargo.toml`

建议同时检查：

- 产品名：`src-tauri/tauri.conf.json`
- 包描述：`src-tauri/tauri.conf.json`
- README 中的功能说明是否与当前版本一致

## 3. 桌面打包

正式构建：

```bash
npm run build:desktop
```

调试构建：

```bash
npm run build:desktop:debug
```

Tauri 默认会先执行前端构建，再生成桌面分发包。

## 4. 产物位置

正式构建后的桌面产物默认位于：

```text
src-tauri/target/release/bundle/
```

调试构建产物一般位于：

```text
src-tauri/target/debug/
```

实际文件类型取决于当前平台。Windows 下一般重点检查安装包和可分发目录。

## 5. 建议交付内容

建议把发布包整理成以下结构：

```text
release/
  MMGH-Agent-Deck-vX.Y.Z/
    installers/
    checksums/
    notes/
```

其中：

- `installers/`: 实际桌面安装包或发行目录
- `checksums/`: 对安装包做 hash 记录
- `notes/`: 发布说明、已知问题、回滚说明

如果只是内部验收版本，至少保留：

- 安装包
- 当前 commit id
- 版本号
- 一份简短更新说明

## 6. 冒烟验收清单

打包后至少检查以下路径：

### 核心路径

- 应用可以正常启动
- Today Workspace 正常加载
- Runtime Workspace 可以创建/继续会话
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
- 应用图标正常
- 窗口默认尺寸和标题正常
- 首次安装与覆盖安装都能正常启动

## 7. 发布说明模板

可以直接按这个最小模板整理：

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

建议使用下面这套最短路径：

1. 完成功能并提交
2. 运行 `npm run release:check`
3. 运行 `npm run build:desktop`
4. 从 `src-tauri/target/release/bundle/` 收集安装包
5. 记录版本号、commit id、更新说明
6. 做一轮桌面冒烟验收
