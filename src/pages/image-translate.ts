import { browser } from 'wxt/browser';
import { takeImageJob } from '../../utils/image-job-store.ts';
import '../../styles/image-translate.css';

if (typeof document !== 'undefined' && typeof location !== 'undefined') {
  const job = new URLSearchParams(location.search).get('job');
  const root = document.body;
  const logoUrl = browser.runtime.getURL('/icon-128.png');

  function renderState(title: string, detail: string) {
    root.innerHTML = `
      <main class="ot-image-state" role="status">
        <span class="ot-brand-mark" aria-hidden="true"><img src="${logoUrl}" alt="" /></span>
        <h1></h1>
        <p></p>
      </main>
    `;
    root.querySelector('h1')!.textContent = title;
    root.querySelector('p')!.textContent = detail;
  }

  if (!job) {
    renderState('缺少图片翻译任务', '请从扩展弹窗重新选择图片。');
  } else {
    root.innerHTML = `
      <header class="ot-image-head">
        <div class="ot-image-brand">
          <span class="ot-brand-mark" aria-hidden="true"><img src="${logoUrl}" alt="" /></span>
          <div>
            <strong>好翻</strong>
            <h1>图片翻译</h1>
          </div>
        </div>
        <div class="ot-image-tools" id="result-tools" hidden>
          <span id="result-count"></span>
          <label><input type="checkbox" id="show-orig" checked /> 显示图片上的译文</label>
        </div>
      </header>
      <main class="ot-image-layout">
        <section class="ot-image-stage" id="stage" aria-label="图片翻译预览">
          <div class="ot-image-loading" role="status">正在读取翻译结果…</div>
        </section>
        <aside class="ot-image-list-shell" id="list-shell" hidden>
          <div class="ot-image-list-head">
            <h2>译文列表</h2>
            <span id="list-count"></span>
          </div>
          <div class="ot-image-list" id="list"></div>
        </aside>
      </main>
    `;

    try {
      // 图片任务已从 storage.local 迁移到 IndexedDB（见 utils/image-job-store.ts），
      // 读取即消费，避免大图长期占用存储。
      const result = (await takeImageJob(job)) ?? null;
      if (!result || typeof result.image !== 'string') {
        renderState('翻译结果已失效', '结果可能已被读取或浏览器已清理存储，请重新翻译图片。');
      } else {
        const segments = Array.isArray(result.segments) ? result.segments : [];
        const stage = document.getElementById('stage') as HTMLElement;
        const list = document.getElementById('list') as HTMLElement;
        const tools = document.getElementById('result-tools') as HTMLElement;
        const listShell = document.getElementById('list-shell') as HTMLElement;
        const toggle = document.getElementById('show-orig') as HTMLInputElement;

        tools.hidden = false;
        listShell.hidden = false;

        stage.replaceChildren();
        const canvas = document.createElement('div');
        canvas.className = 'ot-image-canvas';
        const img = document.createElement('img');
        img.src = result.image;
        img.alt = '图片翻译预览';
        img.addEventListener(
          'error',
          () => {
            stage.innerHTML =
              '<div class="ot-image-loading is-error">图片加载失败，请重新翻译。</div>';
          },
          { once: true },
        );
        canvas.appendChild(img);
        stage.appendChild(canvas);

        // 模型返回的区域结构不受本页控制：坐标缺失/非法的段会渲染成 NaN%
        // （样式被浏览器丢弃，色块错位到左上角），文案缺省会把字面量 "undefined"
        // 渲染出来。渲染前过滤 + 空值兜底。
        const validSegments = segments.filter(
          (s: any) =>
            s &&
            [s.x, s.y, s.w, s.h].every((n: unknown) => Number.isFinite(Number(n))) &&
            typeof (s.translation || s.text) === 'string',
        );

        for (const segment of validSegments) {
          const x = Number(segment.x);
          const y = Number(segment.y);
          const w = Math.max(0, Math.min(1, Number(segment.w)));
          const h = Math.max(0, Math.min(1, Number(segment.h)));
          const boxText = String(segment.translation || segment.text || '');
          if (!boxText) continue;
          const box = document.createElement('div');
          box.className = 'ot-image-segment';
          box.style.left = `${x * 100}%`;
          box.style.top = `${y * 100}%`;
          box.style.width = `${w * 100}%`;
          box.style.height = `${h * 100}%`;
          box.textContent = boxText;
          canvas.appendChild(box);

          const item = document.createElement('article');
          item.className = 'ot-image-item';
          const source = document.createElement('div');
          source.className = 'ot-image-source';
          source.textContent = String(segment.text ?? '');
          const translation = document.createElement('div');
          translation.className = 'ot-image-translation';
          translation.textContent = String(segment.translation ?? '');
          item.append(source, translation);
          list.appendChild(item);
        }

        if (validSegments.length === 0) {
          list.innerHTML = '<div class="ot-image-list-empty">未识别到可翻译文字</div>';
        }
        document.getElementById('result-count')!.textContent = `${validSegments.length} 处文本`;
        document.getElementById('list-count')!.textContent = `${validSegments.length} 条`;

        toggle.addEventListener('change', () => {
          canvas.querySelectorAll('.ot-image-segment').forEach((element) => {
            (element as HTMLElement).hidden = !toggle.checked;
          });
        });
      }
    } catch {
      renderState('无法读取翻译结果', '扩展存储暂不可用，请重新发起图片翻译。');
    }
  }
}
