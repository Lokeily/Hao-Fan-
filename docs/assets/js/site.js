// 好翻官网 · 共享交互脚本
(function () {
  'use strict';

  // ===== 移动端菜单 =====
  const toggle = document.getElementById('navToggle');
  const links = document.getElementById('navLinks');
  if (toggle && links) {
    toggle.addEventListener('click', () => {
      const o = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(o));
    });
    links.addEventListener('click', (e) => {
      if (e.target.closest('a')) links.classList.remove('open');
    });
  }

  // ===== 导航高亮当前页 =====
  const path = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a.op').forEach((a) => {
    const href = a.getAttribute('href') || '';
    if (href === path) a.classList.add('active');
  });

  // ===== 滚动显现 =====
  const io = new IntersectionObserver(
    (es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }),
    { threshold: 0.12 }
  );
  document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

  // ===== 网格子项交错入场：容器标 data-stagger，直接子项依次点亮（上限 600ms） =====
  document.querySelectorAll('[data-stagger]').forEach((group) => {
    const kids = group.querySelectorAll(':scope > *');
    if (!kids.length) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    kids.forEach((c, i) => {
      c.classList.add('reveal-child');
      c.style.setProperty('--d', Math.min(i * 65, 600) + 'ms');
    });
    if (reduced) {
      kids.forEach((c) => c.classList.add('in'));
      return;
    }
    const gio = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (!e.isIntersecting) return;
          e.target.querySelectorAll(':scope > .reveal-child').forEach((c) => c.classList.add('in'));
          gio.unobserve(e.target);
        }),
      { threshold: 0.12 }
    );
    gio.observe(group);
  });

  // ===== FAQ 手风琴互斥 =====
  document.querySelectorAll('details.q').forEach((d) => {
    d.addEventListener('toggle', () => {
      if (d.open) document.querySelectorAll('details.q').forEach((o) => { if (o !== d) o.open = false; });
    });
  });

  // ===== 数字滚动计数动画 =====
  function countUp(el) {
    const target = parseFloat(el.dataset.count || '0');
    const suffix = el.dataset.suffix || '';
    const decimals = Number(el.dataset.decimals || '0');
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.textContent = target.toFixed(decimals) + suffix;
      return;
    }
    const dur = 1300;
    const t0 = performance.now();
    function tick(t) {
      const p = Math.min(1, (t - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = (target * eased).toFixed(decimals) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
  const cio = new IntersectionObserver(
    (es) => es.forEach((e) => { if (e.isIntersecting) { countUp(e.target); cio.unobserve(e.target); } }),
    { threshold: 0.5 }
  );
  document.querySelectorAll('[data-count]').forEach((el) => cio.observe(el));

  // ===== 从 GitHub Release 拉取最新版本号 + 直链下载按钮 =====
  (async () => {
    try {
      const r = await fetch('https://api.github.com/repos/Lokeily/hao-fan/releases/latest');
      if (!r.ok) return;
      const rel = await r.json();
      const v = (rel.tag_name || '').replace(/^v/, '');
      if (!v) return;
      document.querySelectorAll('[data-ver]').forEach((el) => (el.textContent = 'v' + v));
      const names = {
        chrome: 'open-translator-cn-' + v + '-chrome.zip',
        firefox: 'open-translator-cn-' + v + '-firefox.zip',
      };
      document.querySelectorAll('[data-dl]').forEach((a) => {
        const f = names[a.dataset.dl];
        const asset = (rel.assets || []).find((x) => x.name === f);
        if (asset) a.href = asset.browser_download_url;
      });
    } catch {
      /* 保持 releases/latest 兜底 */
    }
  })();
})();
