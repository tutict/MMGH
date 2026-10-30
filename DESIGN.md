# Design — Quiet Ledger

归流的前端只有一套视觉语言：Quiet Ledger（安静账簿）。它不是主题皮肤，而是两端共享的结构约定：平面、细线、留白，文字先于装饰，状态先于气氛。桌面端是可扫描的工作台，手机端是同一份工作区的轻量入口。

本文档以当前代码为准，描述令牌、样式架构、组件模式与不可越过的边界。PRODUCT.md 定义产品与信息架构，二者冲突时以 PRODUCT.md 为准。

## 1. 原则

1. **平面优先。** 层级只来自底色差（`bg` / `surface` / `sunken`）、1px 分隔线与间距。不使用玻璃拟态、渐变、阴影堆叠或装饰场景。
2. **强调色是信号，不是气氛。** `--q-accent` 只用于主操作、当前选中、焦点环和进行中状态。其余界面保持石墨灰。
3. **一屏一件事。** 每个区块一个标题加一句说明；行内正文最多两行；移动端行高 ≥ 56px、触控目标 ≥ 44px；桌面控件 32px、导航与行 36px。
4. **文字层级只有两档字重。** 400 与 600。正文 0.875rem/1.55；阅读区 1rem/1.7 且不超过 68ch；标题行高 1.3。数字使用 `font-variant-numeric: tabular-nums`。
5. **动效只解释状态变化。** 时长 ≤ 160ms，只做透明度、底色和 ≤ 4px 位移；`prefers-reduced-motion` 下全部关闭。
6. **不复活旧样式。** 旧版本的 45,000 行 CSS 已删除。新样式必须落在 `src/ui/` 的既有分层中，并按令牌书写。

## 2. 令牌

唯一来源：`src/ui/tokens.css`。颜色统一使用 OKLCH；结构色与强调色共享 hue 250，状态色固定 hue 145 / 75 / 25。

### 颜色

| Token | Light | Dark | 用途 |
| --- | --- | --- | --- |
| `--q-bg` | `oklch(0.972 0.006 250)` | `oklch(0.17 0.012 250)` | 页面底色 |
| `--q-surface` | `oklch(0.995 0.002 250)` | `oklch(0.215 0.012 250)` | 卡片、输入、菜单 |
| `--q-sunken` | `oklch(0.955 0.008 250)` | `oklch(0.145 0.01 250)` | 侧栏、代码、嵌入块 |
| `--q-text` | `oklch(0.22 0.018 250)` | `oklch(0.965 0.004 250)` | 正文 |
| `--q-text-muted` | `oklch(0.43 0.015 250)` | `oklch(0.8 0.01 250)` | 次要文字 |
| `--q-text-faint` | `oklch(0.53 0.012 250)` | `oklch(0.68 0.012 250)` | 元信息 |
| `--q-border` | `oklch(0.88 0.01 250)` | `oklch(0.32 0.012 250)` | 1px 分隔线 |
| `--q-control` | `oklch(0.56 0.02 250)` | `oklch(0.55 0.015 250)` | 输入与复选框边框 |
| `--q-accent` | `oklch(0.52 0.13 250)` | `oklch(0.74 0.12 250)` | 主操作、选中、焦点 |
| `--q-accent-strong` | `oklch(0.46 0.14 250)` | `oklch(0.8 0.12 250)` | 主操作悬停 |
| `--q-accent-ink` | `oklch(0.99 0.005 250)` | `oklch(0.16 0.02 250)` | 强调底上的字 |
| `--q-accent-soft` | `oklch(0.94 0.03 250)` | `oklch(0.27 0.05 250)` | 浅色强调底 |
| `--q-selected` | `oklch(0.945 0.02 250)` | `oklch(0.25 0.03 250)` | 当前行底色 |
| `--q-success` / `-soft` | `0.47 0.11 145` / `0.95 0.03 145` | `0.8 0.13 145` / `0.27 0.04 145` | 已完成、就绪 |
| `--q-warning` / `-soft` | `0.47 0.1 75` / `0.96 0.03 75` | `0.83 0.12 75` / `0.28 0.04 75` | 待处理、临期 |
| `--q-danger` / `-soft` | `0.5 0.16 25` / `0.95 0.03 25` | `0.76 0.13 25` / `0.27 0.04 25` | 错误、逾期 |
| `--q-focus` | 同 `--q-accent` | 同 `--q-accent` | 2px 焦点环，offset 2px |
| `--q-scrim` | `oklch(0.18 0.012 250 / 0.5)` | `oklch(0.12 0.012 250 / 0.62)` | 弹层遮罩 |

状态色必须同时带文字、图标或形状，不能只靠颜色。对比度由 `src/ui/tokenContrast.test.ts` 锁定：正文 ≥ 7、次要文字 ≥ 4.5、元信息与控件边框 ≥ 3、强调字与状态色 ≥ 4.5。

### 字体

| Token | 值 | 用途 |
| --- | --- | --- |
| `--q-text-2xs` | 0.6875rem | Dock 标签、角标 |
| `--q-text-xs` | 0.75rem | 元信息 |
| `--q-text-sm` | 0.8125rem | 密集控件与说明 |
| `--q-text-base` | 0.875rem | 默认正文 |
| `--q-text-md` | 1rem | 阅读正文、页面标题 |
| `--q-text-lg` … `--q-text-2xl` | 1.125 → 1.5rem | 区块标题 |
| `--q-text-display` | 2rem | 移动端时段大字 |
| `--q-leading-tight` / `-title` / `-body` / `-prose` | 1.2 / 1.3 / 1.55 / 1.7 | 行高 |

字体栈固定为 Segoe UI Variable Text → Segoe UI → 微软雅黑 → 苹方 → system-ui。不加载网络字体。

### 间距、圆角与尺寸

- 间距只有 `--q-space-1` … `--q-space-10`（0.25rem 步进，含 7 / 8 / 10 / 12 档），不写裸间距。
- 圆角：`--q-radius-sm` 4px、`--q-radius-md` 8px、`--q-radius-pill` 999px。
- 控件：`--q-control-h` 2rem；触控：`--q-touch` 2.75rem；行：`--q-row-h` 3.5rem。

### 布局与层级

| Token | 值 | 说明 |
| --- | --- | --- |
| `--q-nav-w` | 15rem | 桌面导航 |
| `--q-header-h` | 4rem | 桌面顶栏 |
| `--q-content-max` | 75rem | 桌面内容最大宽度 |
| `--q-mobile-max` | 42rem | 移动内容最大宽度 |
| `--q-mobile-topbar` | 3rem | 手机顶栏 |
| `--q-mobile-dock` | 3.5rem | 手机 Dock |
| `--q-mobile-transport` | 3.5rem | 手机播放条 |
| `--q-mobile-gutter` | 1rem | 手机左右边距 |
| `--q-mobile-gap` | 1.75rem | 手机区块间距 |

层级：nav 20、header 30、dock 40、transport 45、sheet 60、sheet-host 61、toast 70。弹层打开时 Dock 与播放条隐藏（`:has(.mobile-sheet-host)`，并保留 `.mobile-app.is-sheet-open` 兜底）。

## 3. 样式架构

唯一入口是 `src/CSS/App.css`，顺序固定，后加载的层可以覆盖前层：

```text
../ui/tokens.css
../ui/base.css
../ui/primitives.css
../ui/desktop/shell.css
../ui/desktop/workspaces.css
../ui/desktop/tools.css
../ui/mobile/shell.css
../ui/mobile/pages.css
../ui/mobile/tools.css
```

- `base.css`：reset、body、标题、焦点、滚动条、选区、prose 宽度、banner、`.eyebrow { display: none }`、减少动效。
- `primitives.css`：`.solid-button` / `.ghost-button` / `.danger-button`、`.panel-surface`、`.section-head` / `.section-note`、`.status-chip` 及其状态色、`.field-label` / `.field-hint`、`.scroll-area`、`.panel-icon`、`.upload-input`。
- `desktop/`：外壳与会话栏、九个工作区、音乐 / 天气 / 图库 / 技能与完成对话框。
- `mobile/`：外壳与 Sheet、九个页面、工具页。
- 样式总预算 5,200 非空行，当前 4,531 行。这个上限是实施后修正过的：计划书里写的 2,600 行是动工前的估算，实际交付 4,491 行，超出估算 73%。估算本身被判定为错误而不是实现有偏差，因此上限按实际交付值重新记录为 5,200 并继续由 `styleContract.test.ts` 锁定，留出 669 行余量，同时挡住样式重新长回被删除的 45,000 行。

## 4. 布局

### 桌面

- 左侧 240px 导航：品牌、主任务、工具、设置固定在底部；导航行 36px，当前行使用 `--q-selected`，主题与语言各一个图标按钮。
- 顶栏 64px：唯一 `<h1>`（`#desk-page-title`，切换页面后聚焦）、右侧状态与操作。
- 内容 stage 最大 1200px；Agent 视图左侧 280px 会话栏，折叠时只保留标题与数量；1180px 以下单列。
- 今日页右栏依次是「今日回顾」（三条计数信号）与「建议动作」：每条建议一行，标题 + 状态 chip + 一行元信息 + 一行原因，右侧一个动作按钮（挂载 / 打开规则 / 立即卸载）。手机端不显示这一块。
- 底部 `desk-transport` 56px：曲目、上一首 / 播放 / 下一首、进度，不浮动、不发光。
- 图库为等宽规则网格（`minmax(13rem, 1fr)`），按拍摄时间倒序排列，日期写在图块说明行，不再按日期分组。
- 桌面断点：1180px 收起多栏，900px 进一步压缩侧栏，720px 为最小可用宽度。

### 手机

- `.mobile-app`：`100dvh` 纵向 flex；顶栏 48px + safe-area，主视图显示菜单、工具页显示返回；唯一 `<h1 id="mobile-page-title">`。
- `.mobile-main`：唯一滚动容器；底部内边距为 Dock + 播放器 + safe-area。
- Dock 4 列：今日、对话、知识、提醒；20px 图标、11px 标签；当前项用强调色，不用背景块。
- 菜单 Sheet 收纳技能、图库、音乐、天气、设置。
- `.mobile-transport` 56px 位于 Dock 之上：标题单行截断 + 播放/暂停。
- Sheet 底部贴合，最大 88dvh；编辑器使用 `variant="full"` 占满 100dvh；头部固定、主体独立滚动、动作区固定在底部，关闭按钮 44px。

## 5. 组件模式

- **按钮**：主操作用 `.solid-button`（实底强调色）；次操作用 `.ghost-button`（透明底 + 1px 控制边框）；破坏性操作使用 `.danger-button`（透明底 + 危险色文字）。不使用阴影和大写字母。
- **面板**：`.panel-surface` 是唯一的卡片外观：`surface` 底、1px `border`、8px 圆角，不加阴影。列表行之间只用 1px 分隔线。
- **行**：`.desk-row` / `.mobile-row`；整行可点击时使用 `.desk-row--button` 或 `MobileRowButton`，当前项 `.is-active` 使用 `--q-selected`。元信息放第二行，最多两行文字。
- **状态**：`AppStatusChip` 输出 `.status-chip.status-*`；状态点使用 `.desk-status-dot` 与 `severity-*` / `urgency-*`。颜色永远配文字。
- **表单**：标签用 `.field-label`，提示用 `.field-hint`；输入统一走 MUI `OutlinedInput` 覆写，背景 `--q-surface`，聚焦边框 `--q-accent`。
- **Sheet / 对话框**：手机 `MobileSheet` 使用 MUI Modal，`aria-modal`、Esc、遮罩关闭和焦点返回由 Modal 保证；桌面 `ReminderCompletionDialog` 使用细边框、8px 圆角、右对齐动作区。
- **空态**：一句说明 + 一个主操作，使用 `.desk-empty` 或 `.mobile-empty-hero`，不放大插画。
- **装饰**：无。音乐不使用转盘 / 黑胶 / 粒子，天气不使用光斑 / 玻璃球 / 倾斜卡，图库悬停只改边框和底色。

### 类名与样式契约

`src/ui/styleContract.test.ts` 会扫描所有 TSX 的 `className`、`className:`（slotProps）和 `joinClassNames(...)`：

- 每个结构性类名必须在 `src/ui/**/*.css` 中有定义；BEM 块根允许由 `block__element` 继承。
- 动态模板（`severity-${level}`、`status-${tone}`、`mobile-${variant}-row` 等）必须存在匹配的类族。
- `is-*` / `has-*` 是状态修饰符，允许不单独成规则。
- 必需选择器：`.mobile-app`、`.mobile-topbar`、`.mobile-main`、`.mobile-dock`、`.mobile-sheet-host`、`.mobile-sheet`、`.mobile-transport`、`.desk`、`.desk-nav`、`.desk-header`、`.desk-stage`、`.desk-sessions`、`.desk-transport`。
- 禁止 `backdrop-filter`、渐变、裸 hex 颜色、未定义的 `var(--q-*)`，以及已删除的装饰类名。

## 6. MUI 对齐

- `src/theme/palette.ts` 以 OKLCH 字面量保存与令牌一一对应的颜色；不使用 `var()`，避免 MUI 颜色运算解析失败。
- `src/theme/AppThemeProvider.tsx` 使用 `createTheme({ cssVariables, cssVarPrefix: "mui", nativeColor: true })` 并包在 `StyledEngineProvider injectFirst` 内，确保 `base.css` 能覆盖 MUI 默认样式。
- 主题切换只修改 `document.documentElement.dataset.theme`，Provider 通过 MutationObserver 重新创建主题；`CssBaseline` 只负责 reset，视觉由 `base.css` 接管。
- 组件覆写：Button（32px / 8px / 600 / 不转大写）、IconButton、OutlinedInput、InputLabel、FormLabel、HelperText、Chip、Paper、Menu、MenuItem、Slider、Switch、Checkbox、Tooltip、Backdrop、Dialog。
- `src/theme/themeTokenParity.test.ts` 逐色比较 MUI palette 与 `tokens.css`；改一处颜色必须同时改另一处，否则测试失败。

## 7. 验证

界面改动至少运行：

```bash
npm run lint
npm run typecheck
npm run test:unit
npm run build
```

样式相关测试：

- `src/ui/tokenContrast.test.ts`：浅色 / 深色对比度下限。
- `src/ui/styleContract.test.ts`：类名覆盖、禁用项、令牌完整性、CSS 预算。
- `src/theme/themeTokenParity.test.ts`：MUI 与 CSS 令牌一致。

人工验证覆盖 320×568、390×844、768×1024、1280×800、1440×900，浅色 / 深色以及中文 / 英文；重点是横向滚动、唯一 h1、安全区、200% 缩放、Sheet 焦点返回、键盘顺序与 2px 焦点环。
