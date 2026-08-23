import { buildConfigForm } from '../../utils/ui.ts';
import { browser } from 'wxt/browser';
import { normalizeConfig, type AppConfig } from '../../utils/config.ts';
import {
  configItem,
  autoSitesItem,
  disabledSitesItem,
} from '../../utils/storage.ts';
import {
  parseBackup,
  sanitizeImportedConfig,
  buildClipboardPayload,
  BACKUP_APP,
  BACKUP_KIND,
  BACKUP_VERSION,
} from '../../utils/settings-backup.ts';
import '../../styles/options.css';

// 作为 HTML 页面的脚本来加载（非 WXT 入口），仅在真实扩展页运行时执行。
if (typeof document !== 'undefined' && typeof location !== 'undefined') {
  const logoUrl = browser.runtime.getURL('/icon-128.png');
  document.body.innerHTML = `
    <main class="ot-page">
      <header class="ot-page-head">
        <div class="ot-page-brandline">
          <span class="ot-brand-mark" aria-hidden="true"><img src="${logoUrl}" alt="" /></span>
          <div>
            <p class="ot-page-brand">好翻</p>
            <h1>翻译设置</h1>
          </div>
        </div>
      </header>
      <div id="ot-form-mount"></div>
      <section class="ot-form-section ot-backup" aria-label="备份与迁移">
        <h2>备份与迁移</h2>
        <p class="ot-backup-hint">
          把当前配置（引擎 / 语言偏好 / 术语表 / 站点列表等）导出为 JSON 文件，
          在其它设备上导入即可完成迁移。API Key 默认不包含在导出文件中。
        </p>
        <div class="ot-backup-actions">
          <label class="ot-backup-keys">
            <input id="ot-export-keys" type="checkbox" />
            <span>导出文件中包含 API Key（明文，请妥善保管）</span>
          </label>
          <div class="ot-backup-buttons">
            <button id="ot-export" type="button" class="ot-backup-btn is-primary">导出设置到文件</button>
            <button id="ot-import" type="button" class="ot-backup-btn">从文件导入设置…</button>
            <button id="ot-copy-settings" type="button" class="ot-backup-btn">复制全部设置（含 Key）</button>
            <button id="ot-paste-settings" type="button" class="ot-backup-btn">从剪贴板导入</button>
          </div>
        </div>
        <p id="ot-migrate-hint" class="ot-migrate-hint" hidden>
          💡 检测到尚未配置任何 API Key。如果你是从旧版本迁移过来：先在旧版本的设置里点「复制全部设置」，再回到这里点「从剪贴板导入」即可恢复全部配置。
        </p>
        </div>
        <p id="ot-backup-status" class="ot-backup-status" role="status" aria-live="polite"></p>
      </section>
    </main>
  `;
  buildConfigForm(document.getElementById('ot-form-mount') as HTMLElement, false);

  const statusEl = document.getElementById('ot-backup-status') as HTMLElement;
  const setStatus = (message: string, error = false) => {
    statusEl.textContent = message;
    statusEl.classList.toggle('is-error', error);
  };

  const exportBtn = document.getElementById('ot-export') as HTMLButtonElement;
  const importBtn = document.getElementById('ot-import') as HTMLButtonElement;
  const importFile = document.getElementById('ot-import-file') as HTMLInputElement;
  const includeKeys = document.getElementById('ot-export-keys') as HTMLInputElement;

  // ===== 导出：读取当前存储 → 组装 v1 备份 → 触发下载 =====
  exportBtn.addEventListener('click', async () => {
    exportBtn.disabled = true;
    try {
      const config = normalizeConfig(await configItem.getValue());
      const disabledSites = await disabledSitesItem.getValue().catch(() => []);
      const autoSites = await autoSitesItem.getValue().catch(() => null);
      // 不含 Key 的导出把 apiKeys 清空；含 Key 的原样导出（用户已明确勾选）。
      const exportedConfig: AppConfig = includeKeys.checked
        ? config
        : ({ ...config, apiKeys: {} });
      const payload = {
        app: BACKUP_APP,
        kind: BACKUP_KIND,
        version: BACKUP_VERSION,
        exportedAt: new Date().toISOString(),
        config: exportedConfig,
        disabledSites,
        autoSites,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      const day = new Date().toISOString().slice(0, 10);
      anchor.href = url;
      anchor.download = `haofan-settings-${day}.json`;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 5_000);
      setStatus(
        includeKeys.checked
          ? '已导出（含 API Key，请妥善保管该文件）。'
          : '已导出（不含 API Key，导入后需重新填写）。', false,
      );
    } catch (error) {
      setStatus('导出失败：' + (error instanceof Error ? error.message : String(error)), true);
    } finally {
      exportBtn.disabled = false;
    }
  });

  // ===== 导入：解析 → 校验 → 写回 storage；表单经 storage watch 自动刷新 =====
  importBtn.addEventListener('click', () => importFile.click());
  importFile.addEventListener('change', async () => {
    const file = importFile.files?.[0];
    importFile.value = '';
    if (!file) return;
    if (file.size > 1024 * 1024) {
      setStatus('导入失败：文件超过 1 MB，不是有效的设置备份。', true);
      return;
    }
    importBtn.disabled = true;
    try {
      const backup = parseBackup(await file.text());
      if (!backup) {
        setStatus('导入失败：这不是「好翻」的设置备份文件。', true);
        return;
      }
      const sanitized = sanitizeImportedConfig(backup.config);
      // Key 合并策略：备份里带 Key 就用备份的；没带则保留本机已有 Key，
      // 避免「无 Key 备份覆盖掉本机已填好的 Key」这类意外。
      if (!backup.config.apiKeys || Object.keys(backup.config.apiKeys).length === 0) {
        const current = normalizeConfig(await configItem.getValue());
        sanitized.apiKeys = current.apiKeys;
      }
      await configItem.setValue(sanitized);
      if (Array.isArray(backup.disabledSites)) {
        await disabledSitesItem.setValue(backup.disabledSites);
      }
      if (backup.autoSites !== undefined) {
        await autoSitesItem.setValue(backup.autoSites);
      }
      const keyCount = Object.keys(sanitized.apiKeys).length;
      setStatus(
        `导入成功：引擎 ${sanitized.provider} · 目标语言 ${sanitized.targetLang}` +
          (keyCount > 0 ? ` · 已恢复 ${keyCount} 个服务商的 Key` : ''),
      );
    } catch (error) {
      setStatus('导入失败：' + (error instanceof Error ? error.message : String(error)), true);
    } finally {
      importBtn.disabled = false;
    }
  });

  // ===== 剪贴板快速迁移：同一浏览器内换装新版本时，一键带走全部配置 =====
  const copyBtn = document.getElementById('ot-copy-settings') as HTMLButtonElement;
  const pasteBtn = document.getElementById('ot-paste-settings') as HTMLButtonElement;
  const migrateHint = document.getElementById('ot-migrate-hint') as HTMLElement;

  function updateMigrateHint(config: AppConfig) {
    // 无任何 Key 时提示可从剪贴板恢复；已配置则隐藏避免打扰。
    migrateHint.hidden = Object.keys(config.apiKeys || {}).length > 0;
  }

  copyBtn.addEventListener('click', async () => {
    copyBtn.disabled = true;
    try {
      const config = normalizeConfig(await configItem.getValue());
      await navigator.clipboard.writeText(buildClipboardPayload(config));
      setStatus('已复制全部设置（含 API Key）到剪贴板 ✓', false);
    } catch (error) {
      setStatus('复制失败：' + (error instanceof Error ? error.message : String(error)), true);
    } finally {
      copyBtn.disabled = false;
    }
  });

  pasteBtn.addEventListener('click', async () => {
    pasteBtn.disabled = true;
    try {
      let text = '';
      try {
        text = await navigator.clipboard.readText();
      } catch {
        throw new Error('无法读取剪贴板（浏览器可能未授权），请改用「从文件导入」');
      }
      const backup = parseBackup(text);
      if (!backup) {
        setStatus('导入失败：剪贴板里不是「好翻」的设置备份。', true);
        return;
      }
      const sanitized = sanitizeImportedConfig(backup.config);
      if (!backup.config.apiKeys || Object.keys(backup.config.apiKeys).length === 0) {
        const current = normalizeConfig(await configItem.getValue());
        sanitized.apiKeys = current.apiKeys;
      }
      await configItem.setValue(sanitized);
      if (Array.isArray(backup.disabledSites)) {
        await disabledSitesItem.setValue(backup.disabledSites);
      }
      if (backup.autoSites !== undefined) {
        await autoSitesItem.setValue(backup.autoSites);
      }
      const keyCount = Object.keys(sanitized.apiKeys).length;
      setStatus(`剪贴板导入成功：引擎 ${sanitized.provider} · 目标语言 ${sanitized.targetLang}`);
      updateMigrateHint(sanitized);
    } catch (error) {
      setStatus('导入失败：' + (error instanceof Error ? error.message : String(error)), true);
    } finally {
      pasteBtn.disabled = false;
    }
  });
}