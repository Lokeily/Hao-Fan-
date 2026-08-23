import { chromium } from '@playwright/test';
import { pathToFileURL } from 'node:url';

const base = process.argv[2] ? process.argv[2].replace(/\\/g, '/') : 'docs';
const pages = [
  { file: 'index.html', must: ['.nav', '.hero h1', '.win .tgt', '.stat', '#highlights .card', '.compare tbody tr', '.pipe .step', '.chip', '#download a.dl-card', '#download .dl-mark', 'details.q'] },
  { file: 'features.html', must: ['.page-head h1', '.feat-block', '.feat-group-title', '.compare tbody tr'] },
  { file: 'compare.html', must: ['.page-head h1', '.arch-col.good', '.arch-col.bad', '.compare tbody tr', '.feat-block'] },
  { file: 'install.html', must: ['.page-head h1', '.timeline .tl-item', '.plat-switch', '.trouble details.q'] },
  { file: 'privacy.html', must: ['.page-head h1', '.doc section', '.hl-table'] },
  { file: 'terms.html', must: ['.page-head h1', '.doc section'] },
];

const browser = await chromium.launch({ channel: 'chrome', headless: true });
let failures = 0;
const navSnaps = new Map();
const footSnaps = new Map();

for (const p of pages) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + String(e).slice(0, 160)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console.error: ' + m.text().slice(0, 160)); });

  const url = pathToFileURL(`${base}/${p.file}`).href;
  try {
    await page.goto(url, { waitUntil: 'load' });
  } catch (e) {
    console.log(`❌ ${p.file} 加载失败: ${String(e).slice(0, 120)}`);
    failures++;
    await page.close();
    continue;
  }

  const missing = [];
  for (const sel of p.must) {
    const n = await page.locator(sel).count();
    if (n === 0) missing.push(sel);
  }
  // 每页通用：导航、页脚合规链接
  for (const sel of ['.nav', 'footer a[href="privacy.html"]', 'footer a[href="terms.html"]']) {
    const n = await page.locator(sel).count();
    if (n === 0) missing.push(sel);
  }
  if (errors.length) missing.push(`JS错误×${errors.length}: ${errors[0]}`);

  if (missing.length) {
    console.log(`❌ ${p.file} -> 缺失/异常: ${missing.join(', ')}`);
    failures++;
  } else {
    console.log(`✅ ${p.file}`);
  }

  // 一致性快照：导航（去掉 active 态）与页脚必须六页完全一致
  const snap = await page.evaluate(() => ({
    nav: document.querySelector('#navLinks')
      ? [...document.querySelectorAll('#navLinks a.op')].map((a) =>
          a.className.replace(' active', '').trim() + '|' + a.getAttribute('href') + '|' + a.textContent.trim()
        ).join('\n')
      : 'NO_NAV',
    footer: document.querySelector('footer')
      ? document.querySelector('footer').innerHTML.replace(/\s+/g, ' ').trim()
      : 'NO_FOOTER',
    faqInNav: [...document.querySelectorAll('#navLinks a')].some((a) => /常见问题/.test(a.textContent)),
    opCount: document.querySelectorAll('#navLinks a.op').length,
  }));
  navSnaps.set(p.file, snap.nav);
  footSnaps.set(p.file, snap.footer);
  if (snap.faqInNav) { console.log(`❌ ${p.file} -> 导航不应包含「常见问题」`); failures++; }
  if (snap.opCount !== 4) { console.log(`❌ ${p.file} -> 导航独立页面项应为 4，实际 ${snap.opCount}`); failures++; }
  await page.close();
}

// 跨页一致性判定
{
  const uniqNav = new Set(navSnaps.values());
  const uniqFoot = new Set(footSnaps.values());
  if (uniqNav.size !== 1) { console.log(`❌ 六页导航不一致（${uniqNav.size} 种）`); failures++; }
  else console.log('✅ 六页导航完全一致');
  if (uniqFoot.size !== 1) { console.log(`❌ 六页页脚不一致（${uniqFoot.size} 种）`); failures++; }
  else console.log('✅ 六页页脚完全一致');
}

// 首页专项：计数动画与交错入场
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(pathToFileURL(`${base}/index.html`).href, { waitUntil: 'load' });
  const staggered = await page.evaluate(
    () => document.querySelectorAll('#highlights .grid > .reveal-child').length
  );
  if (staggered < 4) { console.log(`❌ 首页交错入场未生效（${staggered} 个子项）`); failures++; }
  else console.log('✅ 首页网格交错入场');
  await page.locator('.stats').scrollIntoViewIfNeeded();
  await page.waitForTimeout(1500);
  const statText = await page.locator('.stat b').first().textContent();
  if (statText !== '15') { console.log(`❌ 首页计数动画未到位: ${statText}`); failures++; }
  else console.log('✅ 首页数字滚动计数');
  await page.close();
}

await browser.close();
console.log(failures === 0 ? '\nDOCS SMOKE: ALL PASS' : `\nDOCS SMOKE: ${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
