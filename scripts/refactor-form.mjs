// 一次性重构 ui.ts 表单结构（v0.2.1 面板重排）
import { readFileSync, writeFileSync } from 'node:fs';

const p = 'utils/ui.ts';
let c = readFileSync(p, 'utf8');

const start = c.indexOf('  const advancedFields = `');
const endMarker = '  const parsedForm = new DOMParser';
const end = c.indexOf(endMarker);
if (start < 0 || end < 0) throw new Error('markers not found');

const replacement = `  const formMarkup = \`
    <form class="ot-form" autocomplete="off">
      <section class="ot-form-section">
        <h2>① 引擎与密钥</h2>
        <div class="ot-field-grid">
          <label class="ot-field">翻译引擎
            <select data-f="provider"></select>
          </label>
          <label class="ot-field" data-f="modelField">模型
            <select data-f="model"></select>
            <input data-f="modelText" type="text" placeholder="如 gpt-4o" hidden />
          </label>
          <label class="ot-field ot-field-wide">API Key
            <input data-f="apiKey" type="password" autocomplete="new-password" placeholder="当前服务商专用，保存在本地" />
          </label>
          <label class="ot-field ot-field-wide">API Base URL
            <input data-f="baseUrl" type="url" inputmode="url" placeholder="https://..." />
          </label>
          <label class="ot-check ot-field-wide" data-custom-vision hidden>
            <input data-f="customVision" type="checkbox" />
            <span><strong>接口支持图片模型</strong><small>仅为兼容视觉输入的自定义接口开启</small></span>
          </label>
        </div>
        <div class="ot-form-actions">
          <button type="button" data-f="test" class="ot-test-btn">测试连接</button>
          <div class="ot-status" role="status" aria-live="polite"></div>
        </div>
      </section>

      <section class="ot-form-section">
        <h2>② 翻译偏好</h2>
        <div class="ot-field-grid ot-lang-row">
          <label class="ot-field">源语言
            <select data-f="sourceLang"></select>
          </label>
          <label class="ot-field">目标语言
            <select data-f="targetLang"></select>
          </label>
        </div>
        <div class="ot-field-grid">
          <label class="ot-field">翻译模式
            <span>手动 = 点击段落 / 划词才翻译，最省 Token</span>
            <select data-f="translateMode">
              <option value="manual">手动点击 / 划词（推荐）</option>
              <option value="auto">自动整页对照</option>
            </select>
          </label>
          <label class="ot-field">翻译风格
            <select data-f="tone">
              <option value="自然流畅">自然流畅（推荐）</option>
              <option value="正式书面">正式书面</option>
              <option value="轻松口语">轻松口语</option>
              <option value="简洁精炼">简洁精炼</option>
            </select>
          </label>
          <label class="ot-field">译文显示样式
            <span>译文在原文下方的呈现方式</span>
            <select data-f="translationStyle">
              <option value="plain">默认（清淡无装饰）</option>
              <option value="dashed">蓝色虚线分隔</option>
              <option value="underline">蓝色下划线</option>
              <option value="highlight">浅蓝高亮块</option>
            </select>
          </label>
          <label class="ot-field">界面主题
            <span>悬浮按钮 / 面板 / 浮层的深浅色</span>
            <select data-f="themeMode">
              <option value="auto">跟随系统（自动切换）</option>
              <option value="light">始终浅色</option>
              <option value="dark">始终深色</option>
            </select>
          </label>
        </div>
      </section>

      \${siteCtx
        ? \`<section class="ot-form-section">
        <h2>③ 本站</h2>
        <div class="ot-switches">
          <label class="ot-check" id="ot-full-auto">
            <input type="checkbox" data-site-ctx="auto" \${siteCtx.autoTranslate ? 'checked' : ''} />
            <span><strong>自动翻译此站</strong><small>打开 \${siteCtx.host} 的页面时自动开始翻译（手动模式下不生效）</small></span>
          </label>
          <label class="ot-check" id="ot-full-pause">
            <input type="checkbox" data-site-ctx="pause" \${siteCtx.paused ? 'checked' : ''} />
            <span><strong>暂停本站翻译</strong><small>立即停止翻译并清理译文</small></span>
          </label>
        </div>
      </section>\`
        : ''
      }

      <section class="ot-form-section">
        <h2>④ 智能增强与交互</h2>
        <div class="ot-switches">
          <label class="ot-check">
            <input data-f="streaming" type="checkbox" />
            <span><strong>流式输出</strong><small>首段边生成边显示，首字延迟更低</small></span>
          </label>
          <label class="ot-check">
            <input data-f="contextAware" type="checkbox" />
            <span><strong>上下文感知</strong><small>结合页面标题与前段译文，长文更连贯</small></span>
          </label>
          <label class="ot-check">
            <input data-f="qualityCheck" type="checkbox" />
            <span><strong>质量自检</strong><small>校验数字 / 链接 / 代码不被遗漏</small></span>
          </label>
          <label class="ot-check">
            <input data-f="autoLearnTerms" type="checkbox" />
            <span><strong>译文可编辑 · 术语自学习</strong><small>修改译文自动沉淀进术语库</small></span>
          </label>
          <label class="ot-check">
            <input data-f="hoverTranslate" type="checkbox" />
            <span><strong>悬停翻译</strong><small>鼠标悬停段落即显示译文气泡</small></span>
          </label>
          <label class="ot-check">
            <input data-f="inputTranslate" type="checkbox" />
            <span><strong>输入框翻译</strong><small>网页输入框聚焦时提供翻译入口</small></span>
          </label>
        </div>
      </section>

      <section class="ot-form-section">
        <h2>⑤ 省 Token 与多引擎路由</h2>
        <div class="ot-switches">
          <label class="ot-check">
            <input data-f="cacheEnabled" type="checkbox" />
            <span><strong>翻译缓存</strong><small>重复内容直接复用译文</small></span>
          </label>
          <label class="ot-check">
            <input data-f="glossaryEnabled" type="checkbox" />
            <span><strong>术语库</strong><small>本地命中术语，不调用模型</small></span>
          </label>
          <label class="ot-check">
            <input data-f="sentenceCache" type="checkbox" />
            <span><strong>句子级缓存</strong><small>按句缓存，SPA 微变只重译变化句</small></span>
          </label>
        </div>
        <div class="ot-field-grid">
          <label class="ot-field ot-field-wide">术语注入上限
            <span>每批提示词注入的术语条数，越低越省 Token</span>
            <select data-f="glossaryTermLimit">
              <option value="0">关闭（不注入术语，最省）</option>
              <option value="6">6 条（更省）</option>
              <option value="12">12 条（推荐）</option>
              <option value="24">24 条（译名更一致）</option>
            </select>
          </label>
          <label class="ot-field ot-field-wide">备用引擎（故障转移）
            <span>主引擎限流 / 报错时按顺序切换，逗号分隔</span>
            <input data-f="fallbackProviders" type="text" placeholder="deepl, openai" />
          </label>
          <label class="ot-field">长文强模型 · 引擎
            <select data-f="strongProvider"><option value="">不启用</option></select>
          </label>
          <label class="ot-field">长文强模型 · 模型
            <input data-f="strongModel" type="text" placeholder="如 gpt-4o" />
          </label>
          <label class="ot-field">长文路由阈值（字符）
            <input data-f="strongThreshold" type="number" min="200" step="100" />
          </label>
        </div>
        <div class="ot-cache-row">
          <span class="ot-cache-info">翻译缓存：<b data-f="cacheCount">—</b> 条（30 天有效期，上限 2000 条）</span>
          <button type="button" data-f="cacheClear" class="ot-cache-clear">清空翻译缓存</button>
        </div>
      </section>

      <section class="ot-form-section">
        <h2>⑥ 个人词库与系统提示词</h2>
        <div class="ot-field-grid">
          <label class="ot-field ot-field-wide">系统提示词
            <textarea data-f="systemPrompt" rows="3" placeholder="留空使用内置提示词"></textarea>
          </label>
          <label class="ot-field ot-field-wide">我的术语表 <span>每行：源词=译文</span>
            <textarea data-f="customGlossary" rows="3" placeholder="GitHub=GitHub\\nrepository=代码仓库\\nissue=工单"></textarea>
          </label>
        </div>
      </section>
    </form>
  \`;
`;

c = c.slice(0, start) + replacement + c.slice(end);
writeFileSync(p, c);
console.log('form markup rewritten');
