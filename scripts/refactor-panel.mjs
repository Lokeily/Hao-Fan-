// v0.2.1 面板最终布局：4+1 分区 + 高级折叠
import { readFileSync, writeFileSync } from 'node:fs';
const p = 'utils/ui.ts';
let c = readFileSync(p, 'utf8');
const start = c.indexOf('  const formMarkup = `');
const end = c.indexOf('  const parsedForm');
if (start < 0 || end < 0) throw new Error('markers not found');

const m = `  const formMarkup = \`
    <form class="ot-form" autocomplete="off">

      <!-- ═══ ① 翻译引擎 ═══ -->
      <section class="ot-form-section">
        <h2>翻译引擎</h2>
        <div class="ot-field-grid">
          <label class="ot-field">翻译引擎
            <select data-f="provider"></select>
          </label>
          <label class="ot-field" data-f="modelField">模型
            <select data-f="model"></select>
            <input data-f="modelText" type="text" placeholder="如 gpt-4o" hidden />
          </label>
          <label class="ot-field ot-field-wide">API Key
            <input data-f="apiKey" type="password" autocomplete="new-password" placeholder="保存在本地，直发所选服务商" />
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

      <!-- ═══ ② 语言与偏好 ═══ -->
      <section class="ot-form-section">
        <h2>语言与偏好</h2>
        <div class="ot-field-grid">
          <label class="ot-field">源语言
            <select data-f="sourceLang"></select>
          </label>
          <label class="ot-field">目标语言
            <select data-f="targetLang"></select>
          </label>
          <label class="ot-field">翻译模式
            <span>手动 = 点击段落 / 划词才翻译</span>
            <select data-f="translateMode">
              <option value="manual">手动（推荐）</option>
              <option value="auto">自动整页</option>
            </select>
          </label>
          <label class="ot-field">翻译风格
            <select data-f="tone">
              <option value="自然流畅">自然流畅</option>
              <option value="正式书面">正式书面</option>
              <option value="轻松口语">轻松口语</option>
              <option value="简洁精炼">简洁精炼</option>
            </select>
          </label>
          <label class="ot-field">译文样式
            <select data-f="translationStyle">
              <option value="plain">默认</option>
              <option value="dashed">虚线分隔</option>
              <option value="underline">下划线</option>
              <option value="highlight">高亮块</option>
            </select>
          </label>
          <label class="ot-field">界面主题
            <select data-f="themeMode">
              <option value="auto">跟随系统</option>
              <option value="light">浅色</option>
              <option value="dark">深色</option>
            </select>
          </label>
          <label class="ot-field ot-field-wide">朗读人声
            <span>按译入语列出；自动优先在线高质量语音</span>
            <select data-f="ttsVoiceName"></select>
          </label>
        </div>
      </section>

      \${siteCtx ? \`<section class="ot-form-section">
        <h2>本站设置</h2>
        <div class="ot-switches">
          <label class="ot-check" id="ot-full-auto">
            <input type="checkbox" data-site-ctx="auto" \${siteCtx.autoTranslate ? 'checked' : ''} />
            <span><strong>自动翻译此站</strong><small>开启后覆盖全局手动模式</small></span>
          </label>
          <label class="ot-check" id="ot-full-pause">
            <input type="checkbox" data-site-ctx="pause" \${siteCtx.paused ? 'checked' : ''} />
            <span><strong>暂停本站翻译</strong><small>立即停止并清理译文</small></span>
          </label>
        </div>
      </section>\` : ''}

      <!-- ═══ ③ 功能开关 ═══ -->
      <section class="ot-form-section">
        <h2>功能开关</h2>
        <div class="ot-switch-grid">
          <label class="ot-check"><input data-f="streaming" type="checkbox" /><span><strong>流式输出</strong></span></label>
          <label class="ot-check"><input data-f="contextAware" type="checkbox" /><span><strong>上下文感知</strong></span></label>
          <label class="ot-check"><input data-f="qualityCheck" type="checkbox" /><span><strong>质量自检</strong></span></label>
          <label class="ot-check"><input data-f="sentenceCache" type="checkbox" /><span><strong>句子级缓存</strong></span></label>
          <label class="ot-check"><input data-f="cacheEnabled" type="checkbox" /><span><strong>翻译缓存</strong></span></label>
          <label class="ot-check"><input data-f="glossaryEnabled" type="checkbox" /><span><strong>术语库</strong></span></label>
          <label class="ot-check"><input data-f="hoverTranslate" type="checkbox" /><span><strong>悬停翻译</strong></span></label>
          <label class="ot-check"><input data-f="inputTranslate" type="checkbox" /><span><strong>输入框翻译</strong></span></label>
          <label class="ot-check"><input data-f="autoLearnTerms" type="checkbox" /><span><strong>术语自学习</strong></span></label>
        </div>
        <div class="ot-field-grid">
          <label class="ot-field ot-field-wide">术语注入上限
            <select data-f="glossaryTermLimit">
              <option value="0">关闭</option>
              <option value="6">6 条</option>
              <option value="12">12 条（推荐）</option>
              <option value="24">24 条</option>
            </select>
          </label>
        </div>
        <div class="ot-cache-row">
          <span class="ot-cache-info"><b data-f="cacheCount">—</b> 条缓存（30 天 · 上限 2000）</span>
          <button type="button" data-f="cacheClear" class="ot-cache-clear">清空</button>
        </div>
      </section>

      <!-- ═══ ④ 高级设置（默认折叠） ═══ -->
      <details class="ot-form-section ot-advanced-section">
        <summary>高级设置</summary>
        <div class="ot-field-grid">
          <label class="ot-field ot-field-wide">备用引擎（故障转移）
            <span>主引擎限流时按顺序切换，逗号分隔</span>
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
          <label class="ot-field ot-field-wide">系统提示词
            <textarea data-f="systemPrompt" rows="3" placeholder="留空使用内置提示词"></textarea>
          </label>
          <label class="ot-field ot-field-wide">我的术语表 <span>每行：源词=译文</span>
            <textarea data-f="customGlossary" rows="3" placeholder="GitHub=GitHub\\nrepository=代码仓库"></textarea>
          </label>
        </div>
      </details>
    </form>
  \`;
`;

c = c.slice(0, start) + m + c.slice(end);
writeFileSync(p, c);
console.log('panel v0.2.1 layout written');
