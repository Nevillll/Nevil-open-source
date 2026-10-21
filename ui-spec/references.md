# 参考资料

编写本指南时实际阅读过的资料。标注 *（搜索摘要）* 的条目是通过搜索结果中官方页面的摘要获取的，没有完整打开全文；使用其中的具体数字前请再打开原文核对。

## Agent 工作方式
- AGENTS.md 开放格式 — https://agents.md/ — 给编码 Agent 的"README"：放在仓库根目录，写构建/测试命令、代码风格、安全注意事项；离文件最近的 AGENTS.md 优先，用户指示最优先。
- Anthropic《Claude Code: Best practices for agentic coding》— https://www.anthropic.com/engineering/claude-code-best-practices — 给 Agent 验证手段、先探索再计划再实现、具体的上下文、CLAUDE.md 保持精简、Writer/Reviewer 双会话、纠正两次无效就重开。
- Cursor 文档：Rules — https://cursor.com/docs/context/rules — `.cursor/rules/*.mdc` 的 alwaysApply / globs / description 规则类型；支持 AGENTS.md；规则应简短具体。
- GitHub spec-kit：Spec-Driven Development — https://github.com/github/spec-kit/blob/main/spec-driven.md — 规格先于代码，规格 → 计划 → 任务 → 实现；规格是可执行的中心产物。
- Harper Reed《My LLM codegen workflow atm》— https://harper.blog/2025/02/16/my-llm-codegen-workflow-atm/ — 一次问一个问题打磨想法 → spec → 分步提示计划 → 逐步执行 + 测试。
- PatrickJS/awesome-cursorrules — https://github.com/PatrickJS/awesome-cursorrules — 社区 Cursor 规则合集（CC0），可按技术栈参考写法；不要整份照搬。

## 代码审查与提交
- Google Engineering Practices：What to look for in a code review — https://google.github.io/eng-practices/review/reviewer/looking-for.html — 设计、功能、复杂度、测试、命名、注释、风格、文档，逐行审查。
- Google Engineering Practices：Small CLs — https://google.github.io/eng-practices/review/developer/small-cls.html — 一个改动只做一件事；约 100 行通常合理、1000 行通常过大；重构与功能分开。
- Google Engineering Practices：Writing good CL descriptions — https://google.github.io/eng-practices/review/developer/cl-descriptions.html — 首行简短完整的祈使句，正文说明问题与取舍。
- Conventional Commits 1.0.0 — https://www.conventionalcommits.org/en/v1.0.0/ — `type(scope)!: 描述` 格式，与 SemVer 对应。
- GitHub Docs：About protected branches — https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches — 必需状态检查、必需审查、线性历史；默认对管理员不生效，需开启"不允许绕过"。

## 版本与发布
- Semantic Versioning 2.0.0 — https://semver.org/ — 主.次.修订号的含义；0.y.z 表示初始开发阶段。
- Keep a Changelog 1.1.0 — https://keepachangelog.com/en/1.1.0/ — 写给人看的变更记录，Unreleased 区块与 Added/Changed/Deprecated/Removed/Fixed/Security 分类。
- Architecture Decision Records（joelparkerhenderson）— https://github.com/joelparkerhenderson/architecture-decision-record — ADR 是什么、何时写、Nygard / MADR 等模板。

## 配置、安全
- The Twelve-Factor App — https://12factor.net/ 以及 Config 章节 https://12factor.net/config — 配置存于环境，代码可随时公开而不泄露凭证。
- OWASP Secrets Management Cheat Sheet — https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html — 集中管理、最小权限、轮换、检测泄露、不写入代码与日志。
- OWASP Session Management Cheat Sheet — https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html — 会话 Cookie 使用 Secure、HttpOnly、SameSite；不要把令牌存进 localStorage/sessionStorage；服务器端空闲/绝对超时与退出作废。
- OWASP Top 10:2025 — https://owasp.org/Top10/2025/ *（搜索摘要）* — A01 访问控制失效 … A03 软件供应链失败、A05 注入、A10 异常情况处理不当（包括 fail open）。2021 版：https://owasp.org/Top10/2021/
- OWASP Top 10 for LLM Applications 2025 — https://genai.owasp.org/llm-top-10/ — LLM01 提示词注入、LLM02 敏感信息泄露、LLM05 输出处理不当、LLM06 过度授权、LLM10 无限制消耗等。
- gitleaks — https://github.com/gitleaks/gitleaks — 扫描 Git 仓库与提交中的密钥，可作为 pre-commit 与 CI 步骤。

## 测试与代码质量
- Ham Vocke《The Practical Test Pyramid》— https://martinfowler.com/articles/practical-test-pyramid.html — 多写快速的单元测试，少量集成与端到端测试；契约测试。
- Playwright：Best Practices — https://playwright.dev/docs/best-practices — 测试用户可见的行为、测试相互隔离、优先用 getByRole 等面向用户的定位器、使用会自动等待的断言、不测试不受控的第三方。
- Playwright：Emulation — https://playwright.dev/docs/emulation — 用设备预设或 viewport 模拟手机/平板/桌面，模拟语言、时区、深色模式、离线。
- Ruff — https://docs.astral.sh/ruff/ — Python 的 linter + formatter，替代 Flake8/Black/isort。
- TypeScript tsconfig 参考（strict、noUncheckedIndexedAccess 等）— https://www.typescriptlang.org/tsconfig — `strict` 开启整组严格类型检查。

## 前端
- React：Creating a React App — https://react.dev/learn/creating-a-react-app — 官方推荐优先用框架起步；也可用 Vite 等构建工具从零搭建，但需自行选择路由、数据获取方案。
- React：You Might Not Need an Effect — https://react.dev/learn/you-might-not-need-an-effect — 能在渲染时计算的不放 state；用户事件逻辑写在事件处理函数；Effect 获取数据要处理竞态。
- React：Common components（dangerouslySetInnerHTML）— https://react.dev/reference/react-dom/components/common — 对不可信 HTML 使用 dangerouslySetInnerHTML 会引入 XSS。
- Vite：Env Variables and Modes — https://vite.dev/guide/env-and-mode — `VITE_` 前缀变量会被打包到客户端代码，不能放密钥；`*.local` 文件应加入 .gitignore。
- Vite：Server Options — https://vite.dev/config/server-options — 开发服务器 `server.proxy` 转发 API；`server.cors: true`、`server.allowedHosts: true` 是危险设置。
- FastAPI：Features — https://fastapi.tiangolo.com/features/ — 基于 OpenAPI 自动生成接口文档，可用于生成客户端代码；基于 Pydantic 校验数据。
- W3C：How to Meet WCAG 2.2（Quick Reference）— https://www.w3.org/WAI/WCAG22/quickref/ — 文本替代、对比度 4.5:1 / 3:1、320px 重排、键盘可用、焦点可见、24×24 点击目标、页面语言等成功标准。
- MDN：Viewport meta — https://developer.mozilla.org/en-US/docs/Web/HTML/Guides/Viewport_meta_element — 推荐 `width=device-width`；禁止缩放会损害低视力用户，WCAG 要求至少可放大 2 倍。

## 设计系统（docs/07-design-system）

HIG 页面于 2026-10-15 通过 Apple 开发者网站的公开 JSON 数据接口（`https://developer.apple.com/tutorials/data/design/human-interface-guidelines/<页面>.json`）读取全文核对；HIG 网页本身需要 JavaScript 渲染。HIG 中的色值表和部分示意图是图片，无法读取，本仓库也不复制 Apple 的色值。

### Apple Human Interface Guidelines
- HIG《Design principles》— https://developer.apple.com/design/human-interface-guidelines/design-principles — 2026-06 重新加入的八条原则：Purpose、Agency、Responsibility、Familiarity、Flexibility、Simplicity、Craft、Delight。
- HIG《Color》— https://developer.apple.com/design/human-interface-guidelines/color — 颜色一致表达含义；提供浅色/深色/增强对比度变体；不只靠颜色；不硬编码系统色值；不改变语义颜色的用途。
- HIG《Dark Mode》— https://developer.apple.com/design/human-interface-guidelines/dark-mode — 不提供应用内外观开关；深色不是反色；对比度至少 4.5:1、自定义颜色争取 7:1；base / elevated 背景表现纵深；白底图片压暗。
- HIG《Typography》— https://developer.apple.com/design/human-interface-guidelines/typography — 各平台默认/最小字号（iOS 17/11pt、macOS 13/10pt）；避免细字重；少用字体家族；Dynamic Type 文字样式表与字号变大时的布局调整。
- HIG《Layout》— https://developer.apple.com/design/human-interface-guidelines/layout — 按重要性排序、对齐与缩进、分组、渐进披露；按可用空间（size class）而非设备布局；空间变化时功能不变；安全区域。
- HIG《Materials》— https://developer.apple.com/design/human-interface-guidelines/materials — Liquid Glass 只用于控件与导航层；厚材质利于对比、薄材质保留上下文。
- HIG《Accessibility》— https://developer.apple.com/design/human-interface-guidelines/accessibility — 对比度表（与 WCAG AA 一致）、控件尺寸表（iOS 44×44pt 默认 / 28×28pt 最小）、控件间距约 12pt/24pt、减少动态效果的做法、少用自动消失的元素。
- HIG《Motion》— https://developer.apple.com/design/human-interface-guidelines/motion — 有目的、简短精确、频繁交互不加多余动画、可打断、动效可选。
- HIG《Icons》— https://developer.apple.com/design/human-interface-guidelines/icons — 界面图标简化一致、粗细与文字匹配、光学居中、矢量格式、文字替代；常见操作的标准图标表。
- HIG《SF Symbols》— https://developer.apple.com/design/human-interface-guidelines/sf-symbols — 使用须遵守条款；禁止用于 App 图标、Logo 及商标用途；属于 SDK 协议中的系统提供图像。
- HIG《Writing》— https://developer.apple.com/design/human-interface-guidelines/writing — 语气与语调、清楚、动词按钮、避免"我们"、空状态给下一步、错误信息说明怎么改、设置项描述开启效果。
- HIG《Feedback》— https://developer.apple.com/design/human-interface-guidelines/feedback — 反馈方式与重要程度匹配；预期内的删除不警告；只在重要时确认成功；说明为什么无法执行。
- HIG《Loading》— https://developer.apple.com/design/human-interface-guidelines/loading — 尽快显示内容、加载时允许做别的事、确定/不确定进度指示。
- HIG《Modality》— https://developer.apple.com/design/human-interface-guidelines/modality — 只在有明确好处时使用模态；简短；一次一个；明显的关闭方式；关闭前防丢数据。
- HIG《Entering data》— https://developer.apple.com/design/human-interface-guidelines/entering-data — 能自动获取就不让人输入；能选择就不让人打字；不预填密码；即时校验。
- HIG《Searching》— https://developer.apple.com/design/human-interface-guidelines/searching — 搜索放显眼位置、单一入口、显示范围、建议与历史（注意隐私、可清除）。
- HIG《Search fields》— https://developer.apple.com/design/human-interface-guidelines/search-fields — 占位符说明可搜内容、建议词、范围栏。
- HIG《Buttons》— https://developer.apple.com/design/human-interface-guidelines/buttons — 点击区域至少 44x44pt；必须有按下态；醒目按钮每视图一到两个；用样式而非大小区分首选；角色（primary/cancel/destructive），危险操作不设为 primary。
- HIG《Text fields》— https://developer.apple.com/design/human-interface-guidelines/text-fields — 标签 + 占位符提示、密码用安全输入框、宽度匹配内容、Tab 顺序、校验时机、数字格式化。
- HIG《Lists and tables》— https://developer.apple.com/design/human-interface-guidelines/lists-and-tables — 文字简短、选中反馈、列标题用名词且无句末标点、中间省略。
- HIG《Sidebars》— https://developer.apple.com/design/human-interface-guidelines/sidebars — 最多两级、可隐藏但不默认隐藏、熟悉的图标、图标颜色有含义。
- HIG《Tab bars》— https://developer.apple.com/design/human-interface-guidelines/tab-bars — 只做导航不放操作、始终可见、不禁用或隐藏标签、默认五个或更少、标签文字、徽标只用于关键信息。
- HIG《Toolbars》— https://developer.apple.com/design/human-interface-guidelines/toolbars — 分组、不过度拥挤、"更多"菜单放次要操作、主操作在行尾。
- HIG《Sheets》— https://developer.apple.com/design/human-interface-guidelines/sheets — 一次一个；有"完成"必配"取消"或"返回"；三者不同时出现；复杂流程考虑其他形式。
- HIG《Alerts》— https://developer.apple.com/design/human-interface-guidelines/alerts — 少用；常见可撤销操作不弹；不在启动时弹；标题写清情况；按钮用动词，取消永远叫 Cancel；按钮位置；危险样式的使用。
- HIG《Menus》— https://developer.apple.com/design/human-interface-guidelines/menus — 动词标签、需进一步输入加省略号、常用在前、分组、子菜单一层且约五项内、不可用项显示为禁用。
- HIG《Progress indicators》— https://developer.apple.com/design/human-interface-guidelines/progress-indicators — 确定与不确定进度指示器的使用。
- HIG《Designing for the web》— 尝试读取 `designing-for-the-web` 页面返回 404，HIG 当前没有专门的网页设计页面；本仓库的网页翻译由本仓库自行完成。
- Apple Developer《Liquid Glass》技术概览 — https://developer.apple.com/documentation/technologyoverviews/liquid-glass *（搜索摘要）* — "establish hierarchy, create harmony, and maintain consistency"。
- WWDC25《Platforms State of the Union》— https://developer.apple.com/videos/play/wwdc2025/102/ *（搜索摘要）* — 新设计的三条原则：建立层级、创造和谐、保持一致；同心圆角。
- WWDC25《Get to know the new design system》— https://developer.apple.com/videos/play/wwdc2025/356/ *（搜索摘要）* — 层级通过布局与分组表达而非装饰。
- 早期 HIG 的 Clarity / Deference / Depth 三主题 — 当前 HIG 已不再列出，本仓库未能找到并打开旧版原文，仅作背景提及。

### Apple 字体与符号的许可
- Apple《Fonts》— https://developer.apple.com/fonts/ — SF Pro、SF Compact、New York 下载页；许可证随下载包提供。
- SF 字体许可证原文（ScanCode LicenseDB 收录）— https://scancode-licensedb.aboutcode.org/san-francisco-font.html *（搜索摘要）* — "TO BE USED SOLELY FOR CREATING MOCK-UPS OF USER INTERFACES TO BE USED IN SOFTWARE PRODUCTS RUNNING ON APPLE'S … OPERATING SYSTEMS"；不得嵌入软件；不得用于网站内容。
- Apple Developer Forums：Can I use SF UI Text font in a web application? — https://developer.apple.com/forums/thread/733267 *（搜索摘要）* — 回答引用上述许可证，结论为不能在网页应用中使用；建议用 `system-ui`。
- Apple Developer Forums：SF Fonts web font allowed? — https://developer.apple.com/forums/thread/127350 *（搜索摘要）* — "access system fonts in a standards-compliant way by utilizing the system-ui family"。
- Xcode 与 Apple SDK 许可协议第 2.13 节 System-Provided Images（经 Apple StackExchange、Stack Overflow 引用）— https://apple.stackexchange.com/questions/437711/sf-symbols-3-0-use-restrictions *（搜索摘要，协议 PDF 未直接打开）* — 系统提供的图像和符号仅授权用于开发运行在 Apple 品牌产品上的应用。
- Apple《Copyright and Trademark Guidelines》— https://www.apple.com/legal/intellectual-property/guidelinesfor3rdparties.html *（搜索摘要）* — 未经书面许可，不得在网站等处使用 Apple Logo 及 Apple 拥有的图形符号。

### Web 标准与工具
- W3C《Web Content Accessibility Guidelines (WCAG) 2.2》— https://www.w3.org/TR/WCAG22/ — 已读取原文核对：1.4.3、1.4.4、1.4.10、1.4.11、1.4.12、1.4.13、2.2.1、2.2.2、2.3.1、2.3.3、2.4.1、2.4.7、2.4.11、2.4.13、2.5.5、2.5.7、2.5.8、3.2.6、3.3.1–3.3.3、3.3.7、4.1.3；"大字"定义（18pt 或 14pt 粗体）。
- W3C WAI Understanding 文档（target-size-enhanced、animation-from-interactions、focus-not-obscured-minimum、text-spacing、content-on-hover-or-focus、status-messages、focus-appearance）— https://www.w3.org/WAI/WCAG22/Understanding/ — 各标准的目的说明。
- WAI-ARIA Authoring Practices Guide：Dialog (Modal) — https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/ — 打开时焦点移入、Tab 在弹窗内循环、Esc 关闭。
- WAI-ARIA APG：Menu Button — https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/ — Enter/Space/↓ 打开并聚焦第一项；`aria-haspopup`、`aria-expanded`。
- MDN《prefers-reduced-motion》— https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion — 自 2020-01 起各主流浏览器支持。
- MDN《prefers-contrast》— https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-contrast — Baseline 广泛可用。
- MDN《forced-colors》— https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors — Baseline 广泛可用。
- MDN《prefers-reduced-transparency》— https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-transparency — 实验性、主流浏览器支持有限，本规范不依赖它。
- MDN《color-scheme》— https://developer.mozilla.org/en-US/docs/Web/CSS/color-scheme — `light dark` 让元素按系统配色渲染。
- MDN《font-family》— https://developer.mozilla.org/en-US/docs/Web/CSS/font-family — `system-ui` 通用字体族；按列表顺序选择已安装字体。
- MDN《&lt;dialog&gt;》— https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dialog — `showModal()`、Esc 触发 cancel、`closedby`。
- MDN《env()》— https://developer.mozilla.org/en-US/docs/Web/CSS/env — `safe-area-inset-*`。
- Tailwind CSS《Theme variables》— https://tailwindcss.com/docs/theme — `@theme`、命名空间、`--color-*: initial`、`@theme inline`、默认断点（sm 40rem … 2xl 96rem）与默认字体栈。本仓库已用 Tailwind v4.3.3 实际编译 `design-tokens.css` 验证映射。
- Tailwind CSS《Dark mode》— https://tailwindcss.com/docs/dark-mode — 默认基于 `prefers-color-scheme`；手动切换与三态切换写法。
- Playwright《Accessibility testing》— https://playwright.dev/docs/accessibility-testing — `@axe-core/playwright` 的 `AxeBuilder().withTags().analyze()`。
- Playwright《Page》API — https://playwright.dev/docs/api/class-page — `page.emulateMedia({ colorScheme, reducedMotion })`。
- Lucide — https://github.com/lucide-icons/lucide — ISC 许可证的开源图标库（`lucide-react`）。
- Noto CJK — https://github.com/notofonts/noto-cjk — 思源黑体 / Noto Sans CJK，SIL Open Font License 1.1。
- 《中文文案排版指北》— https://github.com/sparanoid/chinese-copywriting-guidelines — 中英文/数字之间加空格、数字与单位加空格（度数、百分比例外）、全角标点、半角数字、专有名词大小写；直角引号列为"争议"。

## 部署与运维
- Caddy：Automatic HTTPS — https://caddyserver.com/docs/automatic-https — 自动申请与续期证书；前提是 DNS 指向服务器、80/443 可从外部访问。
- Caddy：try_files — https://caddyserver.com/docs/caddyfile/directives/try_files — 按顺序尝试文件，找不到时回退到指定文件（SPA 回退到 index.html）。
- Docker Docs：Use secrets in Compose — https://docs.docker.com/compose/how-tos/use-secrets/ — 密钥以文件形式挂载到 `/run/secrets/`，比环境变量更安全；官方镜像支持 `_FILE` 变量。
- PostgreSQL 文档：SQL Dump — https://www.postgresql.org/docs/current/backup-dump.html — pg_dump / pg_restore、自定义格式、`ON_ERROR_STOP`、单事务恢复。
- 腾讯云 ICP 备案文档 *（搜索摘要）* — https://cloud.tencent.com/document/product/243/18907 、https://cloud.tencent.com/document/product/243/19630 、https://cloud.tencent.com/document/product/1207/45756 — 中国大陆服务器的域名需备案，未备案访问被拦截；备案对服务器的要求。

## 外部 API 与可靠性
- Stripe《Designing robust and predictable APIs with idempotency》— https://stripe.com/blog/idempotency — 幂等键、指数退避、随机抖动。

## 案例
- 主人的一个过往项目（私有仓库，2026-10-15 只读审阅；为保持通用已匿名化）— 本指南的反面与正面案例来源，见 docs/00-lessons-learned.md。
