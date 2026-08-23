// 翻译历史存储测试：记录、去重置顶、上限截断、清空。
import test from 'node:test';
import assert from 'node:assert/strict';

// ===== 最小 browser mock（与 translator-network.test.mjs 相同模式）=====
const backing = new Map();
globalThis.browser = {
  runtime: { id: 'haofan-test' },
  storage: {
    local: {
      async get(keys) {
        const list = Array.isArray(keys) ? keys : [keys];
        const out = {};
        for (const key of list) if (backing.has(key)) out[key] = backing.get(key);
        return out;
      },
      async set(items) {
        for (const [key, value] of Object.entries(items)) backing.set(key, value);
      },
      async remove(keys) {
        for (const key of [keys].flat()) backing.delete(key);
      },
    },
  },
};

const { addHistoryEntry, getHistory, clearHistory, HISTORY_LIMIT } = await import(
  '../utils/history-store.ts'
);

test('历史：记录并按时间倒序返回', async () => {
  await clearHistory();
  await addHistoryEntry({ text: 'hello', translation: '你好', source: 'popup' });
  await addHistoryEntry({ text: 'world', translation: '世界', source: 'selection' });
  const list = await getHistory();
  assert.equal(list.length, 2);
  assert.equal(list[0].text, 'world'); // 最新在前
  assert.equal(list[1].text, 'hello');
});

test('历史：同原文+译文去重且置顶刷新时间', async () => {
  await clearHistory();
  await addHistoryEntry({ text: 'a', translation: '甲', source: 'popup', ts: 100 });
  await addHistoryEntry({ text: 'b', translation: '乙', source: 'popup', ts: 200 });
  await addHistoryEntry({ text: 'a', translation: '甲', source: 'selection', ts: 300 });
  const list = await getHistory();
  assert.equal(list.length, 2);
  assert.equal(list[0].text, 'a');
  assert.equal(list[0].source, 'selection'); // 条目被更新而非重复
});

test('历史上限：超过上限丢弃最旧条目', async () => {
  await clearHistory();
  for (let i = 0; i < HISTORY_LIMIT + 10; i++) {
    await addHistoryEntry({ text: `t${i}`, translation: `译${i}`, source: 'popup' });
  }
  const list = await getHistory();
  assert.equal(list.length, HISTORY_LIMIT);
  assert.equal(list[0].text, `t${HISTORY_LIMIT + 9}`); // 最新保留
  assert.equal(list.at(-1).text, 't10'); // 最旧的 10 条被挤出
});

test('历史：空文本 / 空译文不写入；清空生效', async () => {
  await clearHistory();
  await addHistoryEntry({ text: '   ', translation: 'x', source: 'popup' });
  await addHistoryEntry({ text: 'x', translation: '', source: 'popup' });
  assert.equal((await getHistory()).length, 0);
  await addHistoryEntry({ text: 'keep', translation: '保留', source: 'input' });
  await clearHistory();
  assert.equal((await getHistory()).length, 0);
});
