// 官网导航/页脚规范化：六页强制一致（node scripts/docs-unify.mjs）
import { readFileSync, writeFileSync } from 'node:fs';

const GH_SVG =
  '<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg>';

const RELEASES = 'https://github.com/Lokeily/hao-fan/releases/latest';

function buildNav(activeHref, ctaLine) {
  const items = [
    { href: './', label: '首页' },
    { href: 'features.html', label: '功能特性' },
    { href: 'compare.html', label: '与众不同' },
    { href: 'install.html', label: '安装指南' },
  ];
  const links = items
    .map(
      (it) =>
        `        <a class="op${it.href === activeHref ? ' active' : ''}" href="${it.href}">${it.label}</a>`
    )
    .join('\n');
  return `<nav class="nav">
  <div class="container nav-inner">
    <a class="brand" href="./"><img src="assets/img/icon-128.png" alt="好翻 logo" /><span>好翻<i>Haofan</i></span></a>
    <div class="nav-right">
      <button class="nav-toggle" id="navToggle" aria-label="打开菜单" aria-expanded="false"><span></span><span></span><span></span></button>
      <div class="nav-links" id="navLinks">
${links}
        <a class="nav-gh" href="https://github.com/Lokeily/hao-fan" target="_blank" rel="noopener">${GH_SVG}
          GitHub
        </a>
        ${ctaLine}
      </div>
    </div>
  </div>
</nav>`;
}

const FOOTER = `<footer>
  <div class="container foot-grid">
    <div class="foot-brand">
      <a class="brand" href="./"><img src="assets/img/icon-128.png" alt="" /><span>好翻 Haofan</span></a>
      <p>开源、免费、直连自选 AI 的沉浸式双语网页翻译扩展。让每一次外文阅读，都顺畅自然。</p>
    </div>
    <div>
      <h4>产品</h4>
      <ul>
        <li><a href="features.html">功能特性</a></li>
        <li><a href="compare.html">与众不同</a></li>
        <li><a href="install.html">下载安装</a></li>
        <li><a href="${RELEASES}" target="_blank" rel="noopener">更新日志</a></li>
      </ul>
    </div>
    <div>
      <h4>资源</h4>
      <ul>
        <li><a href="https://github.com/Lokeily/hao-fan" target="_blank" rel="noopener">GitHub 仓库</a></li>
        <li><a href="https://github.com/Lokeily/hao-fan/issues" target="_blank" rel="noopener">问题反馈</a></li>
        <li><a href="https://github.com/Lokeily/hao-fan/blob/main/CONTRIBUTING.md" target="_blank" rel="noopener">参与贡献</a></li>
      </ul>
    </div>
    <div>
      <h4>法律与合规</h4>
      <ul>
        <li><a href="privacy.html">隐私政策</a></li>
        <li><a href="terms.html">服务条款</a></li>
        <li><a href="https://github.com/Lokeily/hao-fan/blob/main/LICENSE" target="_blank" rel="noopener">MIT License</a></li>
      </ul>
    </div>
  </div>
  <div class="copyright container">© 2026 好翻 Haofan contributors · 基于 MIT 协议开源 · 由社区驱动维护<br />本扩展为开源工具，按「现状」提供；翻译结果由用户所配置的第三方服务商生成。</div>
</footer>`;

const pages = [
  // [文件, 当前高亮项 href, CTA 行]
  ['index.html', './', '<a class="nav-cta" href="#download">免费下载</a>'],
  ['features.html', 'features.html', `<a class="nav-cta" href="${RELEASES}" target="_blank" rel="noopener">免费下载</a>`],
  ['compare.html', 'compare.html', `<a class="nav-cta" href="${RELEASES}" target="_blank" rel="noopener">免费下载</a>`],
  ['install.html', 'install.html', `<a class="nav-cta" href="${RELEASES}" target="_blank" rel="noopener">免费下载</a>`],
  ['privacy.html', '', `<a class="nav-cta" href="${RELEASES}" target="_blank" rel="noopener">免费下载</a>`],
  ['terms.html', '', `<a class="nav-cta" href="${RELEASES}" target="_blank" rel="noopener">免费下载</a>`],
];

for (const [file, activeHref, ctaLine] of pages) {
  const p = 'docs/' + file;
  let html = readFileSync(p, 'utf8');
  const before = html;
  html = html.replace(/<nav class="nav">[\s\S]*?<\/nav>/, buildNav(activeHref, ctaLine));
  html = html.replace(/<footer>[\s\S]*?<\/footer>/, FOOTER);
  if (html === before) console.log('⚠ 未改动(未匹配到块): ' + file);
  writeFileSync(p, html);
  console.log('✓ 统一: ' + file);
}
