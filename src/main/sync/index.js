// SyncManager — dispatches to registered providers
// Implements rules from docs/SYNC_RULES.md
const fs = require('fs');
const logger = require('../logger');
const WebDAVProvider = require('./providers/webdav');
const FolderProvider = require('./providers/folder');

let provider = null;
let syncTimer = null;
let syncConfig = { mode: 'none', interval: 15 };

const providers = {
  webdav: (cfg) => new WebDAVProvider(cfg),
  folder: (cfg) => new FolderProvider(cfg)
};

function getProvider() { return provider; }
function resetProvider() { provider = null; stopAutoSync(); }

function createProvider(config) {
  const factory = providers[config.mode];
  return factory ? factory(config) : null;
}

async function testConnection(config) {
  const p = createProvider(config);
  if (!p) return { success: false, message: '暂不支持这种同步方式，请选择 WebDAV 或本地文件夹' };
  return p.test();
}

// ─── Core Sync Logic ────────────────────────────────────────

/**
 * Compare local vault metadata with remote.
 * Returns a sync decision object:
 *   { action: 'none'|'upload'|'download'|'conflict', reason, ... }
 */
async function compare(localMeta, vaultPath, remoteDecrypt) {
  if (!provider) return { action: 'none', reason: '尚未配置云同步，请先在设置中填写同步信息' };
  if (syncConfig.mode === 'none') return { action: 'none', reason: '云同步功能未开启，请在设置中启用' };

  const localExists = !!vaultPath && fs.existsSync(vaultPath);
  const remote = await getRemoteMeta();
  const remoteExists = remote.exists;

  // 5.1 Both missing
  if (!localExists && !remoteExists) {
    return { action: 'none', reason: '本地还没有密码库，云端也没有备份文件' };
  }

  // 5.2 Local exists, remote missing
  if (localExists && !remoteExists) {
    return { action: 'upload', reason: '云端还没有备份，正在上传本地密码库...', safeAuto: true };
  }

  // 5.3 Local missing, remote exists
  if (!localExists && remoteExists) {
    return { action: 'download', reason: '检测到云端有密码库备份，正在恢复到本地...', safeAuto: true };
  }

  // 5.4 Both exist — complex comparison

  // §3 key verification
  const canDecryptRemote = remoteDecrypt ? remoteDecrypt.canDecrypt : true;
  if (!canDecryptRemote) {
    return { action: 'conflict', reason: '当前密钥无法解密云端文件，可能是在其他设备上使用了不同的主密码',
      type: 'key_mismatch',
      canDecryptLocal: !!localMeta,
      canDecryptRemote: false };
  }

  // §6 vaultId check
  if (localMeta.vaultId && remote.vaultId && localMeta.vaultId !== remote.vaultId) {
    return { action: 'conflict', reason: '本地和云端属于不同的密码库，无法自动合并', type: 'different_vault' };
  }

  // 7. contentHash check
  if (localMeta.contentHash && remote.contentHash && localMeta.contentHash === remote.contentHash) {
    return { action: 'none', reason: '本地和云端内容完全一致，无需同步', safeAuto: true };
  }

  const lv = localMeta.version || 0;
  const rv = remote.version || 0;
  const lSync = localMeta.lastSyncVersion || 0;

  logger.sync('COMPARE', { lv, rv, lSync, localHash: localMeta.contentHash?.slice(0,8), remoteHash: remote.contentHash?.slice(0,8) });

  // 9. Local > Remote
  if (lv > rv) {
    // 9.1 First sync (lSync===0) or safe upload
    if (lSync === 0 || lSync === rv) {
      // 12. 删除检测
      const localCount = localMeta.itemCount || 0;
      const remoteCount = remote.itemCount || 0;
      const deleted = remoteCount - localCount;
      if (remoteCount > 0 && (deleted >= 5 || deleted / remoteCount >= 0.3)) {
        return { action: 'conflict', reason: '本地删除了较多密码条目，为防止误删请确认', type: 'mass_delete',
          localCount, remoteCount, deleted };
      }
      return { action: 'upload', reason: '本地有新的修改，正在同步到云端...', safeAuto: true,
        localVersion: lv, remoteVersion: rv };
    }
    // 9.2 Conflict: both modified
    return { action: 'conflict', reason: '本地和云端都有新的修改，需要你来决定保留哪一份',
      type: 'both_modified',
      localVersion: lv, remoteVersion: rv, lastSyncVersion: lSync };
  }

  // 10. Remote > Local
  if (rv > lv) {
    // 10.1 Safe download (no local changes since last sync, or never synced)
    if (lv === lSync || lSync === 0) {
      return { action: 'download', reason: '云端有新的更新，正在下载到本地...', safeAuto: true,
        localVersion: lv, remoteVersion: rv };
    }
    // 10.2 Conflict
    return { action: 'conflict', reason: '本地和云端各自有修改，无法自动合并', type: 'both_modified',
      localVersion: lv, remoteVersion: rv, lastSyncVersion: lSync };
  }

  // 11. Same version but content differs
  if (lSync === 0) {
    return { action: 'upload', reason: '这是首次同步，正在将本地密码库上传到云端...', safeAuto: true,
      localVersion: lv, remoteVersion: rv };
  }
  return { action: 'conflict', reason: '本地和云端版本号相同但内容不一致，可能是多设备同时修改导致的', type: 'hash_mismatch',
    localVersion: lv, remoteVersion: rv };
}

async function getRemoteMeta() {
  if (!provider) return { exists: false };
  try {
    return await provider.getRemoteVersion();
  } catch (e) {
    return { exists: false };
  }
}

/**
 * Execute upload with backup
 */
async function pushVault(localPath) {
  if (!provider) throw new Error('同步方式未配置');
  // backup: download remote first as .pvbak
  try {
    const remote = await getRemoteMeta();
    if (remote.exists) {
      const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      await provider.pull(localPath + `.remote_backup_${ts}.pvbak`);
    }
  } catch (e) { /* backup optional */ }
  return provider.push(localPath);
}

/**
 * Execute download with backup
 */
async function pullVault(localPath) {
  if (!provider) throw new Error('同步方式未配置');
  // backup local before overwrite
  if (fs.existsSync(localPath)) {
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    fs.copyFileSync(localPath, localPath + `.local_backup_${ts}.pvbak`);
  }
  return provider.pull(localPath);
}

async function getRemoteInfo() {
  if (!provider) throw new Error('同步方式未配置');
  return provider.getInfo();
}

async function getRemoteVersion() {
  if (!provider) return { exists: false, version: 0 };
  return provider.getRemoteVersion ? provider.getRemoteVersion() : provider.getInfo();
}

function startAutoSync(getVaultPath, getWin) {
  if (!provider || syncConfig.mode === 'none') return;
  if (syncTimer) clearInterval(syncTimer);
  const ms = (syncConfig.interval || 15) * 60 * 1000;

  async function doSync() {
    try {
      const vaultPath = getVaultPath();
      if (!vaultPath || !fs.existsSync(vaultPath)) return;
      await provider.push(vaultPath);
      if (getWin()) getWin().webContents.send('sync:status', { type: 'synced', time: new Date().toISOString() });
    } catch (e) {
      logger.sync('ERROR', e.message);
      if (getWin()) getWin().webContents.send('sync:status', { type: 'error', message: e.message });
    }
  }
  syncTimer = setInterval(doSync, ms);
  logger.sync('AUTO_START', { mode: syncConfig.mode, interval: syncConfig.interval + 'min' });
}

function stopAutoSync() {
  if (syncTimer) { clearInterval(syncTimer); syncTimer = null; }
}

function updateConfig(config) {
  if (config.mode !== undefined) syncConfig.mode = config.mode;
  if (config.url !== undefined) syncConfig.url = config.url;
  if (config.username !== undefined) syncConfig.username = config.username;
  if (config.password !== undefined) syncConfig.password = config.password;
  if (config.path !== undefined) syncConfig.path = config.path;
  if (config.interval !== undefined) syncConfig.interval = config.interval;
  resetProvider();
  if (syncConfig.mode && syncConfig.mode !== 'none') {
    provider = createProvider(syncConfig);
  }
}

function getConfig() { return { ...syncConfig }; }

function registerProvider(name, factory) { providers[name] = factory; }

module.exports = {
  testConnection, pushVault, pullVault, getRemoteInfo, getRemoteVersion,
  compare, startAutoSync, stopAutoSync, updateConfig, getConfig,
  getProvider, registerProvider
};
