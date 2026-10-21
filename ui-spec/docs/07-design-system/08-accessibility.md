# 7.8 无障碍（Accessibility）

目标：**WCAG 2.2 AA 级**，加上 HIG 中比 AA 更严格、且在网页上容易做到的几条（例如 44×44 点击区域、深色模式下争取 7:1）。06-frontend.md 6.6 是最低要求，本篇是完整版。

HIG《Accessibility》对无障碍界面的定义：**直观**（熟悉、一致的交互）、**可感知**（不依赖单一方式传达信息）、**可适应**（适应用户的设备设置和个性化需求）。

## 7.8.1 视觉

| 要求 | 网页做法 | 依据 |
|---|---|---|
| 文字可放大 | 字号用 rem；放大到 200% 不丢内容；320px 宽不需要横向滚动 | HIG：至少可放大到 200%；WCAG 1.4.4、1.4.10 |
| 文字间距可调整 | 不写死容器高度；行高 1.5 倍、段落间距 2 倍、字间距 0.12 倍、词间距 0.16 倍时不截断 | WCAG 1.4.12 |
| 文字对比度 | 正文 ≥ 4.5:1；大字（≥ 18pt，或 ≥ 14pt 粗体，约 24px / 18.67px 粗体）≥ 3:1；深色模式同样检查 | WCAG 1.4.3；HIG 的对比度表采用相同 AA 值 |
| 自定义颜色建议 7:1 | 主要文字在两种模式下都 ≥ 7:1（默认令牌已满足） | HIG《Dark Mode》 |
| 控件与图形对比度 | 输入框边框、复选框、焦点环、图表线条 ≥ 3:1 | WCAG 1.4.11 |
| 不只靠颜色 | 错误 = 红色 + 图标 + 文字；图表系列 = 颜色 + 形状/线型/标注；链接 = 颜色 + 下划线（正文中） | WCAG 1.4.1；HIG《Color》 |
| 增强对比度 | 支持 `prefers-contrast: more`；支持 `forced-colors: active` | HIG：提供更高对比度的配色 |
| 减少动态效果 | 支持 `prefers-reduced-motion` | HIG；WCAG 2.3.3 |
| 不闪烁 | 每秒不超过 3 次闪烁 | WCAG 2.3.1 |

## 7.8.2 操作

| 要求 | 网页做法 | 依据 |
|---|---|---|
| 点击目标 | 触屏主要控件 ≥ 44×44；任何控件 ≥ 24×24 | HIG（iOS 默认 44×44pt）；WCAG 2.5.5（AAA）、2.5.8（AA） |
| 控件间距 | 带边框元素之间约 12px；无边框元素约 24px | HIG《Accessibility》 |
| 键盘可用 | 全部功能可用 Tab / Shift+Tab / Enter / Space / Esc / 方向键完成；没有键盘陷阱 | WCAG 2.1.1、2.1.2；HIG |
| 焦点可见 | `:focus-visible` 2px 焦点环 + 2px 偏移，对比度 ≥ 3:1 | WCAG 2.4.7（AA）；2.4.13（AAA）要求面积 ≥ 2px 周长且前后对比 ≥ 3:1 |
| 焦点不被遮挡 | 吸顶栏、吸底栏、提示不能完全挡住获得焦点的元素 | WCAG 2.4.11 |
| 焦点顺序 | DOM 顺序 = 视觉顺序；不用正数 `tabindex` | WCAG 2.4.3 |
| 跳过重复内容 | 页面顶部"跳到主要内容"链接 | WCAG 2.4.1 |
| 手势替代 | 拖拽、滑动有按钮替代 | HIG；WCAG 2.5.7 |
| 时间限制 | 避免自动消失的关键内容；会话超时前提醒并允许延长 | HIG："Minimize use of time-boxed interface elements"；WCAG 2.2.1 |
| 自动播放 | 不自动播放声音和视频；或提供明显的暂停/停止 | HIG《Accessibility》；WCAG 2.2.2 |

## 7.8.3 理解

| 要求 | 网页做法 | 依据 |
|---|---|---|
| 页面语言 | `<html lang="zh-CN">`；页面中的英文段落 `lang="en"` | WCAG 3.1.1、3.1.2 |
| 页面标题 | 每页唯一的 `<title>`："页面名 - 应用名" | WCAG 2.4.2 |
| 标签和说明 | 每个输入有可见标签；格式要求写在标签或帮助文字里 | WCAG 3.3.2；HIG《Entering data》 |
| 错误识别与建议 | 用文字指出哪个字段错、怎么改 | WCAG 3.3.1、3.3.3 |
| 一致的导航和帮助 | 导航、帮助入口在每页位置一致 | WCAG 3.2.3、3.2.6；HIG Familiarity |
| 避免重复输入 | 同一流程中已填的信息自动带出或可选择 | WCAG 3.3.7 |
| 简化流程 | 一屏一个主要任务；多步流程分步；不可恢复的操作确认 | HIG《Accessibility》Cognitive |

## 7.8.4 读屏软件与语义

HIG 要求为 VoiceOver 描述界面；网页上对应的是**正确的语义 HTML + 必要的 ARIA**：

- 用对元素：`<button>`、`<a href>`、`<input>`、`<label>`、`<table>`、`<nav>`、`<main>`、`<h1>`–`<h6>`、`<ul>`/`<li>`、`<dialog>`（WCAG 1.3.1、4.1.2）。**第一原则：能用原生元素就不用 ARIA。**
- 每个控件都有可访问名称：可见文字、`<label>`、`aria-label` 或 `aria-labelledby`；可访问名称包含可见文字（WCAG 2.5.3）。
- 状态要能被读出：`aria-expanded`、`aria-selected`、`aria-current`、`aria-invalid`、`aria-busy`、`aria-pressed`。
- 动态消息：`role="status"`（礼貌播报）、`role="alert"`（立即播报）（WCAG 4.1.3）。
- 图标和图片：见 [06](06-icons-and-imagery.md)。
- 图表：提供一句话结论（"本月支出比上月高 12%"）+ 可切换的数据表。

## 7.8.5 测试方法

自动工具只能发现一部分问题，必须结合手动检查：

1. **自动**：Playwright + `@axe-core/playwright` 对每个页面在浅色、深色两种模式下扫描，零严重（serious/critical）问题。
2. **键盘**：拔掉鼠标，只用键盘完成主流程（登录 → 新增 → 编辑 → 删除 → 退出），每一步都能看见焦点在哪。
3. **缩放**：浏览器缩放 200%；窗口宽度 320px；浏览器默认字号调到"很大"——无内容丢失、无横向滚动（表格等二维内容除外）。
4. **偏好设置**：分别模拟 `prefers-color-scheme: dark`、`prefers-reduced-motion: reduce`、`forced-colors: active`（Chrome 开发者工具 Rendering 面板可模拟）。
5. **读屏抽查**：macOS VoiceOver（Cmd+F5）或 Windows NVDA，听一遍主要页面：标题层级、按钮名称、表单标签、错误播报。
6. **对比度**：改过颜色就运行 `check-contrast.py`；对图片上的文字等脚本测不到的地方，用浏览器开发者工具的对比度检查。
