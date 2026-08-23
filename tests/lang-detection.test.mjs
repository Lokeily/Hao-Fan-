// 语言检测回归：杜绝「中译中」重复翻译 + 保证英文确实会被翻译。
import test from 'node:test';
import assert from 'node:assert/strict';

const { detectLang, localSkipReason } = await import('../utils/language-detection.ts');

test('中文短 UI 词（两字）判为 zh 并在目标中文时跳过', () => {
  assert.equal(detectLang('设置'), 'zh');
  assert.equal(detectLang('确定'), 'zh');
  assert.equal(localSkipReason('设置', '中文'), 'targetLanguage');
});

test('以中文为主、混少量英文品牌的句子仍判为 zh', () => {
  const text = '这款 iPhone 15 Pro 值得买吗？我觉得体验不错。';
  assert.equal(detectLang(text), 'zh');
  assert.equal(localSkipReason(text, '中文'), 'targetLanguage');
});

test('英文为主的混排判为 latin，目标中文时正常送翻（不误跳过）', () => {
  const text = 'Use the Settings app to configure your iPhone display options.';
  assert.equal(detectLang(text), 'latin');
  assert.equal(localSkipReason(text, '中文'), null);
});

test('纯英文句子判为 latin；目标 English 时跳过、目标中文时翻译', () => {
  assert.equal(detectLang('The quick brown fox jumps over the lazy dog.'), 'latin');
  assert.equal(localSkipReason('Hello world.', 'English'), 'targetLanguage');
  assert.equal(localSkipReason('Hello world.', '中文'), null);
});

test('假名优先判日语；谚文判韩语', () => {
  assert.equal(detectLang('設定を変更します'), 'ja');
  assert.equal(detectLang('안녕하세요 세계'), 'ko');
});

test('西里尔 / 阿拉伯字母等独立文字系统判定不变', () => {
  assert.equal(detectLang('Привет мир друг'), 'cyrillic');
  assert.equal(detectLang('مرحبا بالعالم'), 'arabic');
});

test('空文本 / 纯数字符号 → other（不参与跳过）', () => {
  assert.equal(detectLang(''), 'other');
  assert.equal(detectLang('12345 !!! ---'), 'other');
  assert.equal(localSkipReason('12345', '中文'), 'nonLinguistic');
});
