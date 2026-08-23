import { chromium } from '@playwright/test';
import { pathToFileURL } from 'node:url';

const target = process.argv[2] || 'docs/index.html';
const url = pathToFileURL(target.replace(/\\/g, '/')).href;

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + String(e).slice(0, 200)));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console.error: ' + m.text().slice(0, 200)); });

await page.goto(url, { waitUntil: 'load' });

const checks = [];
const expect = async (name, fn) => {
  try { await fn(); checks.push(`✅ ${name}`); }
  catch (e) { checks.push(`❌ ${name} -> ${String(e).slice(0, 120)}`); }
};

await expect('导航可见', () => page.locator('.nav').isVisible());
await expect('H1 含标语', async () => {
  const t = await page.locator('.hero h1').innerText();
  if (!/自然流畅/.test(t)) throw new Error('h1 文案不符');
});
await expect('双语 mockup 存在', () => page.locator('.win .tgt').first().isVisible());
await expect('数据条 4 项', async () => {
  const n = await page.locator('.stat').count();
  if (n !== 4) throw new Error('count=' + n);
});
await expect('特性卡片 9 张', async () => {
  const n = await page.locator('#features .card').count();
  if (n !== 9) throw new Error('count=' + n);
});
await expect('对比表 6 行', async () => {
  const n = await page.locator('.compare tbody tr').count();
  if (n !== 6) throw new Error('count=' + n);
});
await expect('流水线 8 步', async () => {
  const n = await page.locator('.step').count();
  if (n !== 8) throw new Error('count=' + n);
});
await expect('引擎 chips ≥15', async () => {
  const n = await page.locator('.chip').count();
  if (n < 15) throw new Error('count=' + n);
});
await expect('下载卡 3 张', async () => {
  const n = await page.locator('.dl-card').count();
  if (n !== 3) throw new Error('count=' + n);
});
await expect('FAQ 6 条', async () => {
  const n = await page.locator('details.q').count();
  if (n !== 6) throw new Error('count=' + n);
});
await expect('FAQ 互斥展开', async () => {
  const st = async (i) => page.evaluate((idx) => document.querySelectorAll('details.q')[idx].open, i);
  await page.locator('details.q').nth(2).locator('summary').click({ force: true });
  await page.waitForTimeout(150);
  if ((await st(2)) !== true) throw new Error('第 3 条未展开');
  if ((await st(0)) !== false) throw new Error('第 1 条未收起');
});

// 深色模式抽查
await page.emulateMedia({ colorScheme: 'dark' });
await expect('深色模式下正文可读', async () => {
  const color = await page.locator('.hero .sub').evaluate((el) => getComputedStyle(el).color);
  if (/^rgb\(91,\s*100,\s*112\)$/.test(color)) throw new Error('仍是浅色文案色');
});

// 移动端菜单抽查
await page.setViewportSize({ width: 390, height: 800 });
await page.emulateMedia({ colorScheme: 'light' });
await expect('移动端菜单展开', async () => {
  await page.locator('#navToggle').click();
  await page.locator('#navLinks').getByRole('link', { name: '功能' }).waitFor({ state: 'visible', timeout: 2000 });
});

await page.screenshot({ path: 'docs-preview-mobile.png', fullPage: false });
await page.setViewportSize({ width: 1280, height: 900 });
await page.screenshot({ path: 'docs-preview-desktop.png', fullPage: true });

console.log(checks.join('\n'));
console.log('JS_ERRORS:', errors.length ? '\n' + errors.join('\n') : 'none');
await browser.close();
