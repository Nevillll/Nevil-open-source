/**
 * ui-review.spec.ts — 界面审查截图 + 自动无障碍扫描
 * 说明：dev-guide/docs/07-design-system/09-review-checklist.md
 *
 * 放到 web/e2e/ui-review.spec.ts，按项目修改 PAGES 列表。
 * 依赖：npm i -D @playwright/test @axe-core/playwright
 * 运行：npx playwright test e2e/ui-review.spec.ts
 * 产物：e2e/screenshots/<页面>-<宽度>-<light|dark>.png —— 附到交付报告里。
 *
 * 前提：页面连接的是测试环境的真实后端和测试数据（不是 mock），
 * 并且已登录（用 Playwright 的 storageState 复用登录态，账号密码从环境变量读取，不写进代码）。
 */
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// 需要审查的页面：name 用于文件名，path 为相对路径（baseURL 在 playwright.config.ts 里配置）
const PAGES: { name: string; path: string }[] = [
  { name: 'home', path: '/' },
  // { name: 'records', path: '/records' },
  // { name: 'records-empty', path: '/records?filter=__none__' }, // 空状态
];

const WIDTHS = [390, 768, 1280] as const;
const SCHEMES = ['light', 'dark'] as const;

async function assertNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, '页面出现横向滚动（WCAG 1.4.10）').toBeLessThanOrEqual(0);
}

for (const p of PAGES) {
  for (const width of WIDTHS) {
    for (const scheme of SCHEMES) {
      test(`${p.name} @${width}px ${scheme}`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.emulateMedia({ colorScheme: scheme });
        await page.goto(p.path);
        await page.waitForLoadState('networkidle');

        await assertNoHorizontalOverflow(page);

        await page.screenshot({
          path: `e2e/screenshots/${p.name}-${width}-${scheme}.png`,
          fullPage: true,
        });

        const results = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
          .analyze();
        const serious = results.violations.filter(
          (v) => v.impact === 'serious' || v.impact === 'critical',
        );
        expect(serious, JSON.stringify(serious.map((v) => [v.id, v.help]), null, 2)).toEqual([]);
      });
    }
  }
}

test('减少动态效果：弹窗打开时没有位移/缩放动画', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(PAGES[0].path);
  // 按项目修改：打开一个弹窗或抽屉，然后检查它的 transition 不包含 transform
  // await page.getByRole('button', { name: '新增记录' }).click();
  // const dialog = page.getByRole('dialog');
  // const transition = await dialog.evaluate((el) => getComputedStyle(el).transitionProperty);
  // expect(transition).not.toContain('transform');
});
