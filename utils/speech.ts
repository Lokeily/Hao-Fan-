// 译文朗读（TTS）：基于浏览器内置 speechSynthesis，零依赖。
// 音质策略：现代浏览器的语音列表里包含「在线合成」的高质量人声——
//   · Chrome：Google 网络语音（名称含 Google）
//   · Edge：Microsoft Natural 神经语音（名称含 Natural / Online）
// 自动择优时优先这类在线语音；用户亦可在设置面板按目标语言自选人声。

let currentUtterance: SpeechSynthesisUtterance | null = null;

// 目标语言名 → BCP47。覆盖 LANGUAGES 中的主流语言；未列出的回退默认语音。
const LANG_TO_TAG: Record<string, string> = {
  中文: 'zh-CN',
  粤语: 'zh-HK',
  English: 'en-US',
  日本語: 'ja-JP',
  한국어: 'ko-KR',
  Français: 'fr-FR',
  Deutsch: 'de-DE',
  Español: 'es-ES',
  Italiano: 'it-IT',
  Português: 'pt-BR',
  'Tiếng Việt': 'vi-VN',
  Türkçe: 'tr-TR',
  Nederlands: 'nl-NL',
  Polski: 'pl-PL',
  Русский: 'ru-RU',
  العربية: 'ar-SA',
  हिन्दी: 'hi-IN',
  ไทย: 'th-TH',
};

export function langTagOf(targetLangName: string): string {
  return LANG_TO_TAG[targetLangName] || '';
}

export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function isSpeaking(): boolean {
  return isSpeechSupported() && window.speechSynthesis.speaking;
}

export function stopSpeaking(): void {
  if (!isSpeechSupported()) return;
  window.speechSynthesis.cancel();
  currentUtterance = null;
}

export function getVoices(): SpeechSynthesisVoice[] {
  if (!isSpeechSupported()) return [];
  return window.speechSynthesis.getVoices();
}

/** 语音列表异步加载；就绪（或已就绪）时回调一次。 */
export function onVoicesReady(cb: () => void): void {
  if (!isSpeechSupported()) return;
  if (window.speechSynthesis.getVoices().length > 0) {
    cb();
    return;
  }
  window.speechSynthesis.addEventListener('voiceschanged', cb, { once: true });
  // 兜底：部分浏览器不派发 voiceschanged，轮询一次
  setTimeout(() => {
    if (window.speechSynthesis.getVoices().length > 0) cb();
  }, 800);
}

/** 在线优质语音加权：Natural 神经 > Google 网络 > 普通本地 */
function voiceScore(v: SpeechSynthesisVoice): number {
  const n = v.name.toLowerCase();
  let s = 0;
  if (/natural|neural|online|神经|在线/.test(n)) s += 4;
  if (/google/.test(n)) s += 3;
  if (/microsoft/.test(n) && !/natural|online/.test(n)) s += 1;
  if (v.localService === false) s += 1; // 非本地 = 云端合成，通常更自然
  return s;
}

/** 按语言列出可选人声（择优排序），供设置面板下拉使用。 */
export function listVoicesForLang(tag: string): { name: string; lang: string; online: boolean }[] {
  const voices = getVoices();
  const base = (tag || '').split('-')[0].toLowerCase();
  return voices
    .filter((v) => !base || v.lang.replace('_', '-').toLowerCase().startsWith(base))
    .map((v) => ({
      name: v.name,
      lang: v.lang,
      online: voiceScore(v) >= 3,
    }))
    .sort((a, b) => {
      const va = getVoices().find((v) => v.name === a.name);
      const vb = getVoices().find((v) => v.name === b.name);
      return (vb ? voiceScore(vb) : 0) - (va ? voiceScore(va) : 0);
    });
}

function pickVoice(
  tag: string,
  preferredName?: string,
): SpeechSynthesisVoice | null {
  const voices = getVoices();
  if (voices.length === 0) return null;
  // ① 用户显式选择的人声（跨语言也尊重选择）
  if (preferredName) {
    const named = voices.find((v) => v.name === preferredName);
    if (named) return named;
  }
  if (!tag) return null;
  const base = tag.split('-')[0];
  const inLang = voices.filter((v) => v.lang.replace('_', '-').toLowerCase().startsWith(base));
  if (inLang.length === 0) return null;
  // ② 自动择优：在线/Natural 优先
  return inLang.sort((a, b) => voiceScore(b) - voiceScore(a))[0] ?? null;
}

/** 朗读文本：先取消当前朗读。不支持 TTS 的环境静默忽略。onEnd 在自然结束/被打断时回调。 */
export function speakText(
  text: string,
  targetLangName: string,
  opts?: { voiceName?: string; onEnd?: () => void },
): void {
  if (!isSpeechSupported() || !text.trim()) return;
  stopSpeaking();
  const utterance = new SpeechSynthesisUtterance(text.slice(0, 2000));
  const tag = langTagOf(targetLangName);
  if (tag) utterance.lang = tag;
  const voice = pickVoice(tag, opts?.voiceName);
  if (voice) utterance.voice = voice;
  // 语速略放缓：翻译朗读多用于学习场景，清晰度优先。
  utterance.rate = 0.95;
  utterance.onend = () => {
    currentUtterance = null;
    opts?.onEnd?.();
  };
  utterance.onerror = () => {
    currentUtterance = null;
    opts?.onEnd?.();
  };
  currentUtterance = utterance;
  window.speechSynthesis.speak(utterance);
}

/** 当前是否有本扩展发起的朗读在进行。 */
export function hasActiveUtterance(): boolean {
  return currentUtterance !== null;
}

// ===== 朗读按钮工厂 =====
// 划词面板 / 悬停气泡 / 输入框结果三处共用同一交互：
// 点击朗读 → 变「⏹ 停止」；再次点击或自然结束复位。不支持 TTS 时禁用。
// 只负责行为与文案，样式（class/inline）由调用方按所在浮层自行附加。
export function createSpeakButton(
  getText: () => string,
  getTargetLang: () => string,
  opts?: {
    compact?: boolean;
    getVoiceName?: () => string;
  },
): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  const idleLabel = opts?.compact ? '🔊' : '🔊 朗读';
  const stopLabel = opts?.compact ? '⏹' : '⏹ 停止';
  if (!isSpeechSupported()) {
    btn.textContent = '🔇';
    btn.disabled = true;
    btn.title = '当前浏览器不支持语音朗读';
    btn.setAttribute('aria-label', '当前浏览器不支持语音朗读');
    return btn;
  }
  btn.textContent = idleLabel;
  btn.title = '朗读译文';
  btn.setAttribute('aria-label', '朗读译文');
  btn.addEventListener('click', () => {
    if (hasActiveUtterance()) {
      stopSpeaking();
      btn.textContent = idleLabel;
      btn.title = '朗读译文';
      return;
    }
    const text = getText().trim();
    if (!text || text === '翻译中…') return;
    speakText(text, getTargetLang(), {
      voiceName: opts?.getVoiceName?.() || '',
      onEnd: () => {
        if (btn.isConnected) {
          btn.textContent = idleLabel;
          btn.title = '朗读译文';
        }
      },
    });
    btn.textContent = stopLabel;
    btn.title = '停止朗读';
  });
  return btn;
}
