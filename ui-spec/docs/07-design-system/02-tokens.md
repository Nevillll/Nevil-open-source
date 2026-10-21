# 7.2 设计令牌（Design Tokens）

设计令牌是"有名字的设计决定"：`--ds-text-secondary` 而不是 `#55555c`，`--ds-space-4` 而不是 `16px`。组件只引用令牌，于是换品牌色、加深色模式、调整间距只需改一个文件。

- 起步文件：[templates/design-tokens.css](../../templates/design-tokens.css)（复制到 `web/src/styles/design-tokens.css`）。
- 对比度检查脚本：templates/check-contrast.py。
- 令牌分两层：**基础值**（色值、像素）只出现在 `design-tokens.css`；**语义令牌**（`--ds-surface`、`--ds-danger`）给组件使用。HIG《Color》也要求按用途而不是按外观使用颜色：例如不要把分隔线颜色当文字颜色、不要把次要文字颜色当背景（"Avoid redefining the semantic meanings of dynamic system colors"）。

## 7.2.1 颜色

### HIG 要点（《Color》《Dark Mode》《Accessibility》）

- 同一种颜色不要表示不同含义；如果品牌色表示"可点击"，就不要把不可点击的文字也染成品牌色。
- 每个自定义颜色都要提供浅色和深色两个版本，并考虑"增强对比度"情形。
- 不要只靠颜色区分状态，配合文字或形状图标；红绿、蓝橙组合对色盲用户尤其难分辨。
- 不要硬编码系统颜色的数值：Apple 文档列出的色值仅供设计参考，会随系统版本变化。**因此本规范不复制 Apple 的系统色值**，而是自定一套网页色板并逐一核对对比度。
- 深色模式不是简单反色：背景更暗、前景更亮；有些颜色反转，有些不反转。iOS 深色模式下，"靠前"的界面（弹出层、弹窗）使用更亮的 elevated 背景来表现纵深。
- 深色模式下对比度至少 4.5:1；自定义的前景/背景色建议争取 7:1，尤其是小字（HIG《Dark Mode》）。
- 强调色（accent）克制使用：只用在最需要强调的地方，例如主操作；多个控件都上色反而失去重点。

### 语义颜色令牌

| 令牌 | 用途 | 不要用于 |
|---|---|---|
| `--ds-canvas` | 页面底色 | 卡片 |
| `--ds-surface` | 卡片、列表、表格、侧边栏 | 弹窗 |
| `--ds-elevated` | 弹窗、菜单、弹出框、抽屉 | 页面底色 |
| `--ds-sunken` | 表头、代码块、只读区 | 可点击的按钮 |
| `--ds-text` | 主要文字、标题 | — |
| `--ds-text-secondary` | 次要说明、表格次要列、时间戳 | 唯一的重要信息 |
| `--ds-text-tertiary` | 占位符、帮助文字 | 正文 |
| `--ds-separator` | 装饰性分隔线 | 输入框边框（对比度不够） |
| `--ds-border-control` | 输入框、复选框、未选中开关的边框 | 大面积装饰 |
| `--ds-accent` / `--ds-accent-bg` / `--ds-on-accent` | 链接与强调图标 / 主按钮背景 / 主按钮文字 | 不可点击的装饰文字 |
| `--ds-danger*` `--ds-success*` `--ds-warning*` | 错误、成功、警告（必须配文字或图标） | 品牌装饰 |
| `--ds-focus-ring` | 键盘焦点环 | — |

### 默认色板的对比度（用 `check-contrast.py` 按 WCAG 公式计算）

| 前景 / 背景 | 浅色 | 深色 | 要求 |
|---|---|---|---|
| text / surface | 16.83:1 | 15.61:1 | ≥ 4.5（建议 7） |
| text / elevated | 16.83:1 | 13.13:1 | ≥ 4.5（建议 7） |
| text-secondary / surface | 7.39:1 | 8.25:1 | ≥ 4.5 |
| text-secondary / elevated | 7.39:1 | 6.93:1 | ≥ 4.5 |
| text-tertiary / canvas | 4.86:1 | 6.75:1 | ≥ 4.5 |
| accent（链接）/ surface | 5.80:1 | 6.92:1 | ≥ 4.5 |
| on-accent / accent-bg（主按钮文字） | 5.80:1 | 4.88:1 | ≥ 4.5 |
| on-danger / danger-bg（危险按钮文字） | 5.91:1 | 5.63:1 | ≥ 4.5 |
| border-control / surface（输入框边框） | 3.43:1 | 4.11:1 | ≥ 3（WCAG 1.4.11） |
| focus-ring / canvas | 5.33:1 | 7.68:1 | ≥ 3 |

规则：

- 换品牌色 = 改 `--ds-accent*` 四个值 → 运行 `python3 check-contrast.py src/styles/design-tokens.css` → 全部 PASS 才能提交。
- 新增颜色令牌时，同时把它的配对加入脚本的 `PAIRS`。
- 禁用状态（disabled）的文字 WCAG 不要求对比度，但仍要能看出"这是一个不可用的控件"。

### 深色模式的实现

- **默认跟随系统**：用 `@media (prefers-color-scheme: dark)` 切换令牌值；`:root { color-scheme: light dark; }` 让原生表单控件和滚动条也跟着切换（MDN《color-scheme》）。
- HIG《Dark Mode》建议**不要提供应用内单独的外观开关**（用户需要改两处设置，还可能以为应用坏了）。本规范默认不做主题切换按钮；主人明确要求时再加，做法见 Tailwind 文档《Dark mode》的"三态切换（浅/深/跟随系统）"，并写 ADR。
- 图片：白底图片在深色模式下会"发光"，HIG 建议适当压暗（例如对内容图加 `filter: brightness(.9)`，只在深色模式下）。
- 用户开启"增强对比度"时（`@media (prefers-contrast: more)`），起步文件把次要/三级文字提升为主文字颜色、分隔线加深。Windows 高对比度等"强制颜色"模式（`forced-colors: active`）下，不要依赖背景色表达状态，焦点用系统颜色 `CanvasText`。

## 7.2.2 字体与字号

### 字体：只用系统字体栈

- HIG 中 Apple 平台的系统字体是 San Francisco（SF Pro 等）和 New York。**但它们的下载版许可证规定：只能用于制作运行在 Apple 操作系统上的软件的界面设计稿（mock-up），不得嵌入任何软件，也不得用于网站内容**（SF 字体许可证原文，见 references）。所以网页里**不能**用 `@font-face` 打包或从 CDN 加载 SF 字体。
- 正确做法是使用系统字体栈：在 Apple 设备上，`system-ui` / `-apple-system` 会由浏览器调用系统自带的 SF，无需分发字体文件；在 Windows、Android 上自动使用各自的系统字体。Apple 开发者论坛中的相关回答也建议网页通过 `system-ui` 这类标准关键字使用系统字体。
- 中文：在拉丁字体之后列出 `"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", "Source Han Sans SC"`，最后 `sans-serif`。这些都是用户系统已安装的字体，**不打包**。需要统一字形时可自托管思源黑体 / Noto Sans SC（SIL Open Font License 1.1），但中文字体文件很大，必须按需子集化，并写 ADR。
- 等宽数字：金额、时间、表格数字列使用 `font-variant-numeric: tabular-nums`，让数字对齐。
- 字体家族尽量少：HIG《Typography》"Minimize the number of typefaces you use"。默认只用一个无衬线字体栈 + 一个等宽字体栈。
- 避免细字重：HIG 建议使用 Regular / Medium / Semibold / Bold，避免 Ultralight / Thin / Light。本规范只用 400 / 500 / 600 / 700。

### 字号层级（Web 版 "Dynamic Type"）

HIG 的 Dynamic Type 让用户在系统里调大字号，界面随之放大；HIG《Accessibility》建议文字至少能放大到 200%。网页的等价做法：

1. 字号、行内间距、控件高度都用 `rem`（相对于根字号）；**不要给 `html` 设置 px 字号**，否则会覆盖用户在浏览器设置里调大的默认字号。
2. 页面放大到 200%（WCAG 1.4.4）和 320 CSS 像素宽度（WCAG 1.4.10，相当于 1280 宽放大 400%）时，内容不丢失、不需要横向滚动。
3. 用户把行高设为 1.5 倍字号、段落间距 2 倍、字间距 0.12 倍、词间距 0.16 倍时，内容不能被截断或重叠（WCAG 1.4.12）。所以容器不要写死高度，文字容器用 `min-height` 而不是 `height`。
4. HIG 还要求：字号变大时尽量少截断文字；空间不够时把并排的元素改为上下堆叠、减少列数；保持信息层级不变。

层级参照 HIG iOS 默认档（Large）文字样式的相对比例（例如 Body 17pt、Title 2 22pt、Large Title 34pt），按网页正文 16px 换算后取整（**换算与取整是本规范的选择**，不是 Apple 给网页的数值）：

| 令牌 | rem / px | 字重 | 行高 | 用途 | HIG 对应样式（iOS Large 档） |
|---|---|---|---|---|---|
| `--ds-text-large-title` | 2 / 32 | 700 | 1.25 | 页面主标题，每页一个 `<h1>` | Large Title 34pt |
| `--ds-text-title-1` | 1.75 / 28 | 700 | 1.25 | 大区块标题、数据看板大数字 | Title 1 28pt |
| `--ds-text-title-2` | 1.375 / 22 | 600 | 1.25 | 区块标题 `<h2>` | Title 2 22pt |
| `--ds-text-title-3` | 1.25 / 20 | 600 | 1.25 | 卡片、弹窗标题 `<h3>` | Title 3 20pt |
| `--ds-text-headline` | 1 / 16 | 600 | 1.5 | 列表项标题、强调行 | Headline 17pt Semibold |
| `--ds-text-body` | 1 / 16 | 400 | 1.5（长段落 1.7） | 正文、输入框 | Body 17pt |
| `--ds-text-callout` | 0.9375 / 15 | 400 | 1.5 | 说明块 | Callout 16pt |
| `--ds-text-subhead` | 0.875 / 14 | 400 | 1.5 | 表格单元格、次要信息 | Subhead 15pt |
| `--ds-text-footnote` | 0.8125 / 13 | 400 | 1.5 | 表单帮助文字、脚注 | Footnote 13pt |
| `--ds-text-caption` | 0.75 / 12 | 400/500 | 1.5 | 徽标、图表标注；**最小字号** | Caption 1 12pt |

说明：

- HIG 给出的 iOS 默认正文为 17pt、最小 11pt；macOS 默认 13pt、最小 10pt（HIG《Typography》）。网页中文环境本规范取正文 16px、最小 12px：中文笔画密，小于 12px 难以辨认。
- 中文长段落行高取 1.7（本规范取值），界面文字 1.5，标题 1.25。HIG 也提到：多行长文本宜用更宽松的行距，三行及以上不要用紧凑行距。
- 长文本行宽不超过 `--ds-prose-max`（42rem）。
- 标题层级（h1–h6）按文档结构使用，**不为了字号大小去选标题标签**；视觉大小用令牌控制。

## 7.2.3 间距：4px 网格

- 所有间距、内边距、尺寸取 4 的倍数：4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48 / 64（`--ds-space-1` … `--ds-space-16`）。Tailwind 的 `--spacing: 0.25rem` 恰好让 `p-1 = 4px`、`p-4 = 16px`。
- HIG《Accessibility》："控件之间的间距与控件大小同样重要"——有边框/背景的元素周围约留 12pt，无边框元素的可见边缘周围约留 24pt。网页上对应：带边框的按钮之间至少 `--ds-space-3`（12px），纯文字/图标按钮之间至少 `--ds-space-6`（24px）或扩大它们的点击区域。
- 用间距表达分组（HIG《Layout》：用留白、容器形状或分隔线表示哪些元素相关）：组内间距 < 组间间距，例如表单字段之间 16px、字段组之间 32px。
- 常用值：页面左右边距 手机 16px / 平板 24px / 桌面 32px；卡片内边距 16px（手机）/ 24px（桌面）；表格单元格 水平 12–16px、垂直 8–12px。（本规范取值）

## 7.2.4 尺寸与点击区域

| 平台（HIG《Accessibility》） | 默认控件尺寸 | 最小控件尺寸 |
|---|---|---|
| iOS / iPadOS | 44×44 pt | 28×28 pt |
| macOS | 28×28 pt | 20×20 pt |

| WCAG 2.2 | 要求 |
|---|---|
| 2.5.8 Target Size (Minimum)，AA | 点击目标至少 24×24 CSS 像素（或满足间距等例外） |
| 2.5.5 Target Size (Enhanced)，AAA | 至少 44×44 CSS 像素 |

本规范：

- **触屏可达的主要控件（按钮、导航项、列表行、复选框的可点区域）≥ 44×44 CSS 像素**（`--ds-hit-min`），与 HIG 按钮"至少 44x44 pt 点击区域"一致。
- 桌面密集界面（数据表格行内操作、工具栏）可用 32px 高度的小号控件（`--ds-control-h-sm`），但**绝不小于 24×24**，且在触屏宽度下自动换回 44px。
- 视觉上小、点击区域大的做法：图标按钮视觉 20px，`padding` 撑到 44px；或用伪元素 `::before { inset: -10px }` 扩展点击区域。

## 7.2.5 圆角

| 令牌 | 值 | 用于 |
|---|---|---|
| `--ds-radius-sm` | 6px | 徽标、标签、复选框 |
| `--ds-radius-md` | 8px | 按钮、输入框 |
| `--ds-radius-lg` | 12px | 卡片、菜单、弹出框 |
| `--ds-radius-xl` | 16px | 弹窗、底部抽屉 |
| `--ds-radius-full` | 9999px | 胶囊按钮、头像、开关 |

**同心圆角**（呼应 Liquid Glass 的"和谐"原则）：嵌套元素的内层圆角 = 外层圆角 − 两者之间的内边距。例如 16px 圆角的弹窗内边距 8px，里面的按钮用 8px 圆角。数值为本规范取值。

## 7.2.6 阴影与层级（Elevation）

- 浅色模式：用阴影表达层级。`--ds-shadow-1` 卡片（可选，很多时候边框即可）、`--ds-shadow-2` 下拉菜单/弹出框、`--ds-shadow-3` 弹窗。
- 深色模式：阴影在暗背景上几乎看不见。按 HIG《Dark Mode》的 base / elevated 思路，**用更亮的背景（`--ds-elevated`）+ 细的浅色描边**表示"更靠前"，起步文件已这样定义。
- 不要叠加多层阴影或多层半透明。毛玻璃（`backdrop-filter: blur()`）只用于浮在内容上的导航层；HIG《Materials》提醒：较厚（更不透明）的材质更利于文字对比，较薄的材质更能保留背景上下文——网页上请保证毛玻璃上的文字对比度在最坏背景下仍达标，否则改用不透明背景。

## 7.2.7 动效令牌

HIG《Motion》没有给出具体毫秒数，要求的是：有目的地使用动效、简短精确、频繁发生的交互不加多余动画、可以被打断、并在"减少动态效果"开启时减少运动。以下数值为本规范取值：

| 令牌 | 值 | 用于 |
|---|---|---|
| `--ds-duration-instant` | 100ms | 悬停、按下的颜色变化 |
| `--ds-duration-fast` | 150ms | 菜单、提示气泡出现 |
| `--ds-duration-normal` | 250ms | 弹窗、抽屉进出 |
| `--ds-duration-slow` | 350ms | 页面级过渡（尽量不用） |
| `--ds-duration-fade` | 150ms | 纯透明度变化；减少动态效果时也保留 |
| `--ds-ease-enter` | `cubic-bezier(0, 0, 0.2, 1)` | 进入（减速停下） |
| `--ds-ease-exit` | `cubic-bezier(0.4, 0, 1, 1)` | 退出（加速离开） |
| `--ds-ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` | 位置/尺寸变化 |

`prefers-reduced-motion: reduce` 时，起步文件把 fast/normal/slow 设为 0ms，只保留淡入淡出。详见 [05](05-interaction-and-motion.md)。

## 7.2.8 层级（z-index）

只能使用以下令牌，禁止 `z-index: 9999`（本规范取值）：

`--ds-z-base 0` < `--ds-z-sticky 100`（吸顶表头）< `--ds-z-nav 200`（侧边栏、底部标签栏）< `--ds-z-dropdown 300` < `--ds-z-overlay 400`（遮罩）< `--ds-z-modal 500` < `--ds-z-toast 600` < `--ds-z-tooltip 700`

用 `<dialog>` 的 `showModal()` 打开的弹窗会进入浏览器的 top layer，位于所有 z-index 之上，无需设置（MDN《dialog》）。

## 7.2.9 断点

沿用 Tailwind CSS v4 默认断点（Tailwind 文档《Theme variables》默认值）：

| 名称 | 最小宽度 | 典型设备 | 本规范的布局（见 03） |
|---|---|---|---|
| （默认） | 0 | 手机 | 单列；底部标签栏或顶栏菜单 |
| `sm` | 40rem / 640px | 大手机横屏 | 单列，可两列卡片 |
| `md` | 48rem / 768px | 平板竖屏 | 两列；可显示可收起的侧边栏 |
| `lg` | 64rem / 1024px | 平板横屏、小笔记本 | 常驻侧边栏 + 内容 |
| `xl` | 80rem / 1280px | 桌面 | 内容最大宽度 1280px 居中 |
| `2xl` | 96rem / 1536px | 大屏 | 同 xl，不无限拉宽 |

必须截图验证的宽度：**390 / 768 / 1280**（见 [09](09-review-checklist.md)）。

## 7.2.10 在 Tailwind 中使用

起步文件末尾的 `@theme inline { … }` 把语义令牌注册为工具类（已用 Tailwind v4.3 实际编译验证）：

```html
<section class="bg-surface text-fg rounded-lg p-4 shadow-1">
  <h2 class="text-title-2 font-semibold">本月支出</h2>
  <p class="text-subhead text-fg-secondary">更新于 10 分钟前</p>
  <button class="h-11 rounded-md bg-accent-bg px-4 text-on-accent hover:bg-accent-bg-hover">
    新增记录
  </button>
</section>
```

- `--color-*: initial` 会清空 Tailwind 默认调色板，`bg-blue-500` 这类类名不再生成——这是故意的，防止绕过令牌。
- 用 `@theme inline` 是因为这些主题变量引用了其他变量；Tailwind 文档说明不加 `inline` 可能解析到意外的值。
- 不用 Tailwind 的项目：直接用 `var(--ds-…)` 写 CSS Modules，删掉起步文件的 `@theme` 区块。
