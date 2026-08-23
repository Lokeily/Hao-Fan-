// 为指定容器添加 data-stagger，并移除其子元素上冗余的 reveal 类（避免双重隐藏）
// 可重复执行；node scripts/docs-apply-stagger.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const jobs = [
  {
    file: 'docs/index.html',
    containers: [
      ['<div class="grid">', '<div class="grid" data-stagger>'], // #highlights
      ['<div class="pipe reveal">', '<div class="pipe" data-stagger>'],
      ['<div class="chips reveal">', '<div class="chips" data-stagger>'],
      ['<div class="dl-grid reveal">', '<div class="dl-grid" data-stagger>'],
    ],
    stripRevealFrom: [
      'class="card reveal"', 'class="card teal reveal"', 'class="card violet reveal"',
      'class="card amber reveal"', 'class="compare-wrap reveal"',
    ],
  },
  {
    file: 'docs/features.html',
    containers: [['<main class="container" style="padding-bottom:30px">', '<main class="container" style="padding-bottom:30px" data-stagger>']],
    stripRevealFrom: [
      'class="feat-block reveal"', 'class="feat-block teal reveal"', 'class="feat-block violet reveal"',
      'class="feat-block amber reveal"', 'class="sec-head reveal"', 'class="feat-group-title reveal"',
      'class="compare-wrap reveal"',
    ],
  },
  {
    file: 'docs/compare.html',
    containers: [['<main class="container" style="padding-bottom:30px">', '<main class="container" style="padding-bottom:30px" data-stagger>']],
    stripRevealFrom: [
      'class="sec-head reveal"', 'class="arch reveal"', 'class="compare-wrap reveal"',
      'class="feat-block good reveal"', 'class="feat-block violet reveal"',
      'class="feat-block teal reveal"', 'class="feat-block amber reveal"',
    ],
  },
  {
    file: 'docs/install.html',
    containers: [['<main class="container" style="padding-bottom:30px">', '<main class="container" style="padding-bottom:30px" data-stagger>']],
    stripRevealFrom: [
      'class="sec-head reveal"', 'class="timeline reveal"', 'class="plat-switch reveal"',
      'class="trouble reveal"',
    ],
  },
];

for (const job of jobs) {
  let html = readFileSync(job.file, 'utf8');
  let changed = 0;
  for (const [from, to] of job.containers) {
    if (html.includes(from)) { html = html.split(from).join(to); changed++; }
    else if (!html.includes(to)) console.log(`⚠ 容器未找到: ${job.file} <- ${from}`);
  }
  for (const cls of job.stripRevealFrom) {
    const before = html;
    html = html.split(cls).join(cls.replace(' reveal', ''));
    if (html !== before) changed++;
  }
  writeFileSync(job.file, html);
  console.log(`✓ ${job.file} (改动点 ${changed})`);
}
