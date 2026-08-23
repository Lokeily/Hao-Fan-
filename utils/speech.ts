// 译文朗读（TTS）：基于浏览器内置 speechSynthesis，零依赖、离线可用。
// 语言匹配策略：按目标语言名映射 BCP47 标签，优先选择前缀匹配的语音；
// 找不到匹配时用浏览器默认语音兜底（总比不能读好）。

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

function pickVoice(tag: string): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;
  if (!tag) return voices[0] ?? null;
  const base = tag.split('-')[0];
  return (
    voices.find((v) => v.lang.replace('_', '-') === tag) ||
    voices.find((v) => v.lang.replace('_', '-').startsWith(base)) ||
    null
  );
}

/** 朗读文本：会先取消当前朗读。不支持 TTS 的环境静默忽略。onEnd 在自然结束/被打断时回调。 */
export function speakText(
  text: string,
  targetLangName: string,
  onEnd?: () => void,
): void {
  if (!isSpeechSupported() || !text.trim()) return;
  stopSpeaking();
  const utterance = new SpeechSynthesisUtterance(text.slice(0, 2000));
  const tag = langTagOf(targetLangName);
  if (tag) utterance.lang = tag;
  const voice = pickVoice(tag);
  if (voice) utterance.voice = voice;
  // 语速略放缓：翻译朗读多用于学习场景，清晰度优先。
  utterance.rate = 0.95;
  utterance.onend = () => {
    currentUtterance = null;
    onEnd?.();
  };
  utterance.onerror = () => {
    currentUtterance = null;
    onEnd?.();
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
  opts?: { compact?: boolean },
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
    speakText(text, getTargetLang(), () => {
      if (btn.isConnected) {
        btn.textContent = idleLabel;
        btn.title = '朗读译文';
      }
    });
    btn.textContent = stopLabel;
    btn.title = '停止朗读';
  });
  return btn;
}
