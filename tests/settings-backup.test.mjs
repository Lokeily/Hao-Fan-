// 设置备份（导出 / 导入）的纯函数测试：解析校验与字段净化。
// 导入文件可能来自任意来源，这里锁定「脏数据不得进入 storage」的行为。
import test from 'node:test';
import assert from 'node:assert/strict';

const { DEFAULT_CONFIG } = await import('../utils/config.ts');
const {
  parseBackup,
  sanitizeImportedConfig,
  isSettingsBackup,
} = await import('../utils/settings-backup.ts');

function validBackup(overrides = {}) {
  return {
    app: 'hao-fan',
    kind: 'settings',
    version: 1,
    exportedAt: '2026-08-23T00:00:00.000Z',
    config: { provider: 'openai', targetLang: '日本語' },
    disabledSites: ['example.com'],
    autoSites: null,
    ...overrides,
  };
}

test('parseBackup：合法备份可解析', () => {
  const parsed = parseBackup(JSON.stringify(validBackup()));
  assert.ok(parsed);
  assert.equal(parsed.config.provider, 'openai');
  assert.deepEqual(parsed.disabledSites, ['example.com']);
});

test('parseBackup：坏 JSON / 错误标识 / 错误版本 / 非法站点列表全部拒绝', () => {
  assert.equal(parseBackup('{not json'), null);
  assert.equal(parseBackup(JSON.stringify({ ...validBackup(), app: 'other' })), null);
  assert.equal(parseBackup(JSON.stringify({ ...validBackup(), kind: 'other' })), null);
  assert.equal(parseBackup(JSON.stringify({ ...validBackup(), version: 2 })), null);
  assert.equal(
    parseBackup(JSON.stringify({ ...validBackup(), disabledSites: 'example.com' })),
    null,
  );
  assert.equal(parseBackup(JSON.stringify([1, 2, 3])), null);
});

test('sanitizeImportedConfig：只接受类型匹配的已知字段，未知字段被丢弃', () => {
  const out = sanitizeImportedConfig({
    provider: 'zhipu',
    targetLang: 'English',
    glossaryTermLimit: 0,
    streaming: false,
    evilField: '<script>alert(1)</script>',
    cacheEnabled: 'yes', // 类型错误：字符串，应拒绝并保留默认 true
    strongThreshold: Number.NaN, // 非有限数，应拒绝
  });
  assert.equal(out.provider, 'zhipu');
  assert.equal(out.targetLang, 'English');
  assert.equal(out.glossaryTermLimit, 0); // 显式 0 必须保留（不被兜底改写）
  assert.equal(out.streaming, false);
  assert.equal((out ).evilField, undefined);
  assert.equal(out.cacheEnabled, DEFAULT_CONFIG.cacheEnabled);
  assert.equal(out.strongThreshold, DEFAULT_CONFIG.strongThreshold);
});

test('sanitizeImportedConfig：translateMode 收敛到枚举、apiKeys 过滤非法条目', () => {
  const out = sanitizeImportedConfig({
    translateMode: 'yolo',
    apiKeys: { openai: 'sk-ok', bad: 123 },
  });
  assert.equal(out.translateMode, 'manual'); // 非法值收敛为默认手动模式
  assert.deepEqual(out.apiKeys, { openai: 'sk-ok' });
});

test('sanitizeImportedConfig：空输入返回完整默认配置', () => {
  const out = sanitizeImportedConfig(null);
  for (const key of Object.keys(DEFAULT_CONFIG)) {
    if (key === 'apiKeys') continue;
    assert.deepEqual(out[key], DEFAULT_CONFIG[key]);
  }
  assert.deepEqual(out.apiKeys, {});
});

test('isSettingsBackup：类型守卫与 parseBackup 结论一致', () => {
  const good = JSON.parse(JSON.stringify(validBackup()));
  assert.equal(isSettingsBackup(good), true);
  assert.equal(isSettingsBackup({}), false);
});
