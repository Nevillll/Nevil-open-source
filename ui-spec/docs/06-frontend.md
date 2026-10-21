# 06 前端：网页界面怎么做才算"真的做完"

> 核心原则：**一个项目一个前端；界面显示的必须是真实后端的真实数据；手机和电脑都能用；任何人都能用键盘和读屏软件操作；浏览器里不放任何秘密。**
>
> 默认技术栈：**React + TypeScript + Vite** 构建的单页应用（SPA），由同一台服务器的反向代理提供静态文件，通过同源 `/api` 调用自己的后端。换用其他框架需要写 ADR。
>
> 本篇讲工程上怎么做对；**界面怎么设计**（颜色、字号、间距、组件、交互、文案、深色模式）见 [07 设计系统](07-design-system/README.md)。新项目把 [templates/design-tokens.css](../templates/design-tokens.css) 复制到 `web/src/styles/`。

## 6.1 选型与项目起步

- React 官方文档推荐新应用优先从框架（如 Next.js、React Router）起步；如果只需要一个由自己后端提供数据的客户端应用，也可以用 Vite 等构建工具"从零搭建"，但路由、数据获取等需要自己选型（react.dev《Creating a React App》）。
- 对"后端服务 + 管理界面/仪表盘"这类个人项目，默认用 Vite + React + TypeScript 的 SPA：结构简单、部署成静态文件即可。需要 SEO、服务端渲染时，写 ADR 讨论是否改用框架。
- **一个项目只有一个前端**。不要同时存在"后端输出的 HTML 页面"、"旧前端"、"新前端"。替换前端时：写 ADR → 新前端覆盖全部旧功能并验收 → 删除旧前端和它的路由（过往项目的教训见 00-lessons-learned.md 问题 3）。
- 开新项目时用官方脚手架（如 `npm create vite@latest`，选择 React + TypeScript 模板），不要从网上复制一整套别人的项目。UI 组件库、图表库只选一个，写进 ADR。

推荐目录：

```
web/
  index.html            <html lang="zh-CN">、<meta name="viewport" content="width=device-width">
  src/
    main.tsx            入口
    app/                路由、全局布局、登录态
    pages/              每个页面一个目录（页面组件 + 该页专用组件 + 测试）
    components/         通用组件（按钮、表单项、表格、弹窗……）
    api/                唯一的 API 客户端 + 由接口定义生成/编写的类型
    lib/                与界面无关的工具函数（格式化金额、日期等）
    styles/             design-tokens.css（设计令牌，见 07-design-system/02-tokens.md）+ 全局样式
  e2e/                  Playwright 端到端测试
  .env.example          只放 VITE_ 开头的、可以公开的配置
  vite.config.ts
  tsconfig.json         "strict": true
```

## 6.2 TypeScript 与代码规范

- `tsconfig.json` 开启 `"strict": true`（TypeScript 文档：开启后启用整组严格检查，如 `strictNullChecks`、`noImplicitAny`）。可选再开 `noUncheckedIndexedAccess`，让按下标取值时必须处理"可能不存在"。
- CI 中运行类型检查（`tsc -b` 或 `tsc --noEmit`）、lint（ESLint，含 `eslint-plugin-react-hooks`）和 `vite build`，三者都必须通过。
- 禁止用 `any`、`@ts-ignore` 掩盖错误；确需时写注释说明原因。
- 组件只做展示和交互；计算、格式化放 `lib/`，并写单元测试（Vitest）。
- **少用 `useEffect`**：能在渲染时算出来的值直接算，不要存进 state 再用 Effect 同步；用户操作引发的请求（提交表单）写在事件处理函数里，不写在 Effect 里（react.dev《You Might Not Need an Effect》）。
- 用 Effect 获取数据时必须处理竞态（快速切换时旧请求的结果晚到），并处理加载中和出错；更好的做法是把数据获取封装进统一的自定义 Hook 或成熟的数据请求库（同上文）。

## 6.3 前后端接口约定（Contract）

- **接口以后端的机器可读定义为准**：后端用 FastAPI 等框架时，会根据代码自动生成 OpenAPI 文档，并可用于生成客户端代码（FastAPI 文档《Features》）。前端的类型从这份定义生成，或严格按它手写，并在 PR 里注明对应的接口版本。
- 新功能先在 spec 里写清接口（路径、请求、响应、错误格式），前后端按同一份定义开发。**不为后端不存在的接口写前端代码**；需要新接口，先做后端。
- 前端只通过 `src/api/` 里的一个客户端访问后端，统一处理：基础路径、认证、超时、错误格式、把后端错误转成中文提示。
- 后端返回的数据在边界处做运行时校验（如 zod），格式不符时显示错误，而不是让页面崩溃。
- 金额等精确数值：后端用字符串或定点数传输，前端只做展示格式化，不用浮点数做会计计算。时间：后端传带时区的 ISO 8601，前端按用户时区显示。

## 6.4 真实数据才算完成

- **用模拟数据（mock）做出来的页面只能叫"界面原型"，不能叫"完成"**。交付报告必须写明每个页面连的是真实接口还是假数据。
- 开发时用 Vite 的 `server.proxy` 把 `/api` 转发到本地后端（Vite 文档《Server Options》），这样前端代码在开发和生产都用同一个相对路径 `/api`。
- 生产环境中，前端和 API 走**同一个域名**（反向代理把 `/api/*` 转给后端，其余路径给前端静态文件），避免跨域配置，也避免把 API 地址写死。不要出现 `localhost`、`api.example.com` 之类的占位地址。
- 每个数据区域都要有四种状态：**加载中、空数据、出错（带重试按钮）、有数据**。浏览器验证时四种都要看到。
- E2E 测试（Playwright）在测试库上跑真实前后端：登录 → 新增 → 刷新后仍在 → 修改 → 删除 → 退出。

## 6.5 响应式（手机和电脑都能用）

- `index.html` 必须有 `<meta name="viewport" content="width=device-width">`；**不要**用 `user-scalable=no` 或 `maximum-scale=1` 禁止缩放——这会让低视力用户无法放大阅读（MDN《Viewport meta》）。
- 内容在 320 CSS 像素宽度下不能需要左右滚动（WCAG 2.2 成功标准 1.4.10 Reflow；数据表格、图表等本身需要二维布局的内容除外）。
- 文字放大到 200% 时内容和功能不丢失（WCAG 1.4.4）。字号用 `rem`，容器用相对单位、flex/grid 布局。
- 宽表格在手机上改为卡片列表，或放进可横向滚动的容器（只有表格滚动，不是整页）。
- 验证宽度至少：390px（常见手机）、768px（平板）、1280px（桌面）。Playwright 可以用设备预设或 `viewport` 配置模拟（Playwright 文档《Emulation》）。
- 断点、导航形态、栅格的具体规则见 [07-design-system/03-layout.md](07-design-system/03-layout.md)。

## 6.6 无障碍（Accessibility）基础

以 WCAG 2.2 AA 级为目标。下面是最常被违反、也最容易做到的几条（完整要求见 [07-design-system/08-accessibility.md](07-design-system/08-accessibility.md)）：

| 要求 | 怎么做 | 依据 |
|---|---|---|
| 页面语言 | `<html lang="zh-CN">` | WCAG 3.1.1 |
| 页面标题 | 每个页面有描述性的 `<title>` | WCAG 2.4.2 |
| 图片和图标有文字替代 | 有意义的图片写 `alt`；纯图标按钮加 `aria-label`；装饰图片 `alt=""` | WCAG 1.1.1 |
| 表单项有标签 | 每个输入框都有关联的 `<label>`（不是只有 placeholder）；错误提示用文字说明哪里错了 | WCAG 1.3.1、3.3.1 |
| 用正确的元素 | 能点的用 `<button>`/`<a>`，不要给 `<div>` 绑点击；标题用 `h1`–`h6`；表格数据用 `<table>` | WCAG 1.3.1、2.1.1 |
| 键盘可用 | 所有功能能只用键盘（Tab/Enter/Space/Esc）完成；弹窗打开时焦点进入、关闭后焦点回到触发按钮 | WCAG 2.1.1、2.1.2 |
| 焦点可见 | 不要用 `outline: none` 去掉焦点框而不提供替代样式 | WCAG 2.4.7 |
| 颜色对比 | 正文与背景对比度 ≥ 4.5:1，大号文字 ≥ 3:1；按钮边框、图表线条等 ≥ 3:1 | WCAG 1.4.3、1.4.11 |
| 不只靠颜色 | 收入/支出、成功/失败除了颜色还要有文字或图标 | WCAG 1.4.1 |
| 点击目标够大 | 可点击区域至少 24×24 CSS 像素（或彼此留足间距） | WCAG 2.5.8 |
| 图表 | 提供文字摘要或可切换的数据表 | WCAG 1.1.1 |

自动化工具（如浏览器开发者工具的 Lighthouse 无障碍检查、axe）能发现一部分问题，但不能代替用键盘实际走一遍主流程。

## 6.7 前端安全

- **浏览器里没有秘密**：Vite 会把 `VITE_` 开头的环境变量打包进前端代码，任何访问者都能看到；Vite 文档明确要求 `VITE_*` 变量不要放 API Key 等敏感信息（Vite 文档《Env Variables and Modes》）。第三方 API Key 只放后端，由后端代为调用（见 05-integrations.md）。
- `.env.local`、`.env.*.local` 可能含敏感值，确保 `*.local` 在 `.gitignore` 里（同上文）。
- **登录态用 Cookie，不用 localStorage**：OWASP《Session Management Cheat Sheet》要求不要把认证令牌、会话 ID、JWT 存进 `localStorage`/`sessionStorage`（任何一处 XSS 都能读走），推荐 `HttpOnly; Secure; SameSite=Strict` 的 Cookie。会话在服务器端设置空闲超时和绝对超时，退出时在服务器端作废。
- 登录密码、会话签名密钥、API 访问令牌是三样不同的东西，各自独立生成。
- **防 XSS**：React 默认会转义渲染的文本。不要对用户数据、第三方数据、大模型输出使用 `dangerouslySetInnerHTML`；React 文档说明这会引入 XSS 漏洞，确需渲染 HTML 时只用可信且经过净化的内容（react.dev《Common components》）。
- **前端的权限判断只是体验**：隐藏按钮不等于禁止操作，每个接口必须在后端检查认证和权限（OWASP Top 10:2025 A01 访问控制失效）。
- 不要为了"能访问"而放开限制：Vite 开发服务器的 `server.cors: true`、`server.allowedHosts: true` 会让任意网站读取开发服务器内容，Vite 文档标注为危险设置；开发服务器也不要暴露到公网。

## 6.8 构建与部署

- 生产环境部署的是 `vite build` 生成的静态文件（`dist/`），**不是**开发服务器（`vite dev`）。
- 反向代理配置 SPA 回退：找不到对应文件的路径返回 `index.html`，让前端路由处理。例如 Caddy 的 `try_files {path} /index.html`（Caddy 文档《try_files》），并确保 `/api/*` 先被转发到后端，不会被回退规则吞掉。
- 构建在 CI 中进行，部署工作流在前端代码变化时也要触发；构建产物不提交到仓库。
- 部署后用浏览器打开真实域名，确认：页面加载、登录可用、浏览器控制台无报错、请求打到的是正确的 `/api`。

## 6.9 前端交付检查清单

- [ ] 项目里只有一个前端；旧页面和旧路由已删除（或写明了删除计划）
- [ ] 所有页面连接真实接口；报告中列出每个页面的数据来源
- [ ] 类型检查、lint、单元测试、`vite build` 全部通过（附输出）
- [ ] Playwright E2E 覆盖主流程，在测试库上运行通过
- [ ] 390px / 768px / 1280px 截图，无横向溢出；放大到 200% 可用
- [ ] 加载中 / 空数据 / 出错 / 有数据四种状态都检查过
- [ ] 只用键盘能完成主流程；焦点可见；表单项有标签；对比度达标
- [ ] 前端代码和构建产物中没有任何密钥；登录态在 HttpOnly Cookie 中
- [ ] 没有对不可信内容使用 `dangerouslySetInnerHTML`
- [ ] 浏览器控制台无报错
- [ ] 已执行 [07 设计审查清单](07-design-system/09-review-checklist.md)：390 / 768 / 1280 × 浅色 / 深色截图已附在交付报告中
