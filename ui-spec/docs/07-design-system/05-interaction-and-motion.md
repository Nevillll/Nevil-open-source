# 7.5 交互、反馈与动效

## 7.5.1 反馈（HIG《Feedback》）

反馈让人知道：发生了什么、下一步能做什么、操作结果如何、如何避免错误。**反馈的打扰程度要与信息的重要程度相称。**

| 情况 | 做法 |
|---|---|
| 持续的状态（同步中、已保存、离线） | 被动显示在相关内容旁边或顶栏，不打断 |
| 用户操作成功（普通） | 轻量反馈：按钮短暂显示"已保存"、列表里出现新行、轻提示 |
| 重要操作成功（付款、发布） | 明确的成功确认（页面或提示） |
| 操作失败 | 一定要告诉用户，并说明原因和下一步（HIG："Show people when a command can't be carried out and help them understand why"） |
| 可能造成**意外且不可逆**的数据丢失 | 先警告/确认；**预期之内**的删除（用户就是要删）不必警告，提供撤销即可 |
| 关键、需要立即处理 | 确认框（见 04 的 7.4.7），少用 |

规则：
- **每次点击都要有即时反馈**（100ms 内有视觉变化：按下态、loading），即使结果要等服务器返回。
- 反馈要可访问：颜色 + 文字 + 图标；对读屏用户用 `aria-live` 播报（WCAG 4.1.3）。
- 乐观更新（先在界面上显示成功，再等服务器确认）只用于失败概率低、可回滚的操作；失败时回滚并明确告知。

## 7.5.2 加载（HIG《Loading》《Progress indicators》）

- **尽快显示点什么**：先显示页面框架和骨架屏，内容到了再替换；空白页会被理解为出了问题。
- 等待期间允许用户做别的事：只锁住正在加载的区域，不锁整页。
- 知道时长/进度 → 确定进度条（上传、导入）；不知道 → 不确定指示器（转圈、骨架）。
- 长时间操作（> 几秒的导入、导出、生成报表）：显示进度和预计剩余，允许离开页面后台继续，完成后通知。
- 本规范取值：请求 < 300ms 不显示加载态（避免闪烁）；骨架屏至少显示 300ms 再替换（避免闪一下）；请求超时（默认 15 秒，按接口调整）后进入错误状态并可重试。

## 7.5.3 模态与打断（HIG《Modality》）

- 模态只在有明确好处时用：确保收到关键信息、确认或修改刚才的操作、专注完成一个范围明确的小任务。
- 保持简短；不要在模态里嵌套多层导航；一次一个模态；始终能明显地关闭；关闭会丢数据时先确认。
- 引导流程可以跳过（HIG《Design principles》Agency："make it easy to skip or escape"）。

## 7.5.4 撤销优于确认

HIG《Design principles》强调"帮助人们从错误中恢复"，《Alerts》建议常见、可撤销的删除不弹确认。因此：

1. 删除单条记录 → 直接删除（后端软删除）+ 轻提示"已删除" + "撤销"按钮（提示不自动消失，或至少给足时间并在聚焦时暂停）。
2. 批量删除、清空、不可恢复的操作 → 确认框，标题写清数量和后果（"永久删除 128 条记录？此操作无法撤销。"）。

## 7.5.5 动效（HIG《Motion》）

HIG 要点：
- **有目的地使用动效**，不为动而动；过多的动画会分散注意力，甚至让人身体不适。
- **动效是可选的**：不要把动画作为传达重要信息的唯一方式。
- 反馈动画**简短、精确**；**频繁发生的交互不要加多余动画**。
- 动作要符合预期：从上方滑下来的面板，就向上收回，而不是向侧面滑走。
- **可以被打断**：不要让人等动画播完才能操作。

本规范的网页规则：

| 场景 | 动效 | 时长 / 曲线（本规范取值） |
|---|---|---|
| 悬停、按下 | 只变颜色/背景 | `--ds-duration-instant` |
| 菜单、提示气泡 | 淡入 + 2–4px 位移 | `--ds-duration-fast`，`--ds-ease-enter` |
| 弹窗、抽屉进入 | 淡入 + 从边缘移入（抽屉）/ 轻微放大（弹窗 0.96→1） | `--ds-duration-normal`，`--ds-ease-enter` |
| 退出 | 比进入更快 | `--ds-duration-fast`，`--ds-ease-exit` |
| 列表增删 | 高度/透明度过渡 | `--ds-duration-fast` |
| 页面切换 | 默认不加动画 | — |

- 只对 `transform` 和 `opacity` 做动画（性能好、不引起重排）；不要对 `width`、`height`、`top` 做动画。
- 不使用无限循环的装饰动画；加载指示器除外。
- 任何闪烁每秒不超过 3 次（WCAG 2.3.1）。
- 自动播放、超过 5 秒的移动内容（轮播图等）必须能暂停（WCAG 2.2.2）；本规范默认不用自动轮播。

### 减少动态效果（Reduce Motion）

HIG《Accessibility》：开启"减少动态效果"时，减少自动和重复的动画（缩放、放大、外围运动）；建议把 x/y/z 方向的过渡**换成淡入淡出**，避免对模糊做动画，避免 z 轴深度变化。WCAG 2.3.3（AAA）也要求由交互触发的运动动画可以被关闭。

网页实现（MDN《prefers-reduced-motion》）：

```css
/* 默认只写淡入；位移/缩放只在用户没有要求减少动效时添加 */
.sheet { transition: opacity var(--ds-duration-fade) var(--ds-ease-enter); }
@media (prefers-reduced-motion: no-preference) {
  .sheet { transition: opacity var(--ds-duration-normal) var(--ds-ease-enter),
                       transform var(--ds-duration-normal) var(--ds-ease-enter); }
}
```

Tailwind：位移/缩放类前面加 `motion-safe:`，例如 `motion-safe:transition-transform`。JavaScript 动画库：读取 `window.matchMedia('(prefers-reduced-motion: reduce)')`，为真时跳过运动。

验证：在浏览器开发者工具中模拟 `prefers-reduced-motion: reduce`（Playwright：`page.emulateMedia({ reducedMotion: 'reduce' })`），打开/关闭弹窗、抽屉、菜单，确认没有位移和缩放。

## 7.5.6 键盘与指针

- 所有操作都能用键盘完成（WCAG 2.1.1）；不要覆盖浏览器和系统的常用快捷键（HIG《Accessibility》："Avoid overriding system-defined keyboard shortcuts"）。
- 应用自定义快捷键时：提供列表（例如按 `?` 显示）、不用单个字母键直接触发危险操作（WCAG 2.1.4 要求单字符快捷键可关闭或重新映射）。
- 复杂手势（拖拽排序、滑动删除）必须有按钮替代（HIG《Accessibility》"Offer alternatives to gestures"；WCAG 2.5.7 Dragging Movements）。
- 悬停才出现的内容（提示气泡）：鼠标能移到气泡上不消失、Esc 可关闭、不自动消失（WCAG 1.4.13）；触屏上没有悬停，重要信息不能只放在悬停提示里。
