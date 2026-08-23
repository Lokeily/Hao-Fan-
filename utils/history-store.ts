import { storage } from 'wxt/utils/storage';

// ===== 翻译历史 =====
// 记录「用户主动发起」的单条翻译（划词 / 输入框 / 弹窗文本），
// 悬停翻译刻意不记录——被动触发会产生大量噪声条目。
// 仅存本地（storage.local），上限 200 条、同文本+译文去重置顶。

export type HistorySource = 'selection' | 'input' | 'popup';

export interface HistoryEntry {
  text: string;
  translation: string;
  ts: number;
  source: HistorySource;
}

const historyItem = storage.defineItem<HistoryEntry[]>('local:translateHistory', {
  defaultValue: [],
});

const MAX_HISTORY = 200;
const MAX_FIELD_CHARS = 5000;

function clampField(value: string): string {
  return value.length > MAX_FIELD_CHARS ? `${value.slice(0, MAX_FIELD_CHARS)}…` : value;
}

export async function addHistoryEntry(
  entry: Omit<HistoryEntry, 'ts'> & { ts?: number },
): Promise<void> {
  try {
    const list = await historyItem.getValue();
    const text = clampField(entry.text);
    const translation = clampField(entry.translation);
    if (!text.trim() || !translation.trim()) return;
    // 同「原文+译文」去重：已有条目置顶并刷新时间。
    const filtered = list.filter((e) => !(e.text === text && e.translation === translation));
    filtered.unshift({
      text,
      translation,
      source: entry.source,
      ts: entry.ts ?? Date.now(),
    });
    await historyItem.setValue(filtered.slice(0, MAX_HISTORY));
  } catch {
    /* 历史记录失败不影响翻译主流程 */
  }
}

export function getHistory(): Promise<HistoryEntry[]> {
  return historyItem.getValue();
}

export async function clearHistory(): Promise<void> {
  await historyItem.setValue([]);
}

/** 供测试/调用方使用的常量 */
export const HISTORY_LIMIT = MAX_HISTORY;
