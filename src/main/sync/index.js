// SyncManager — dispatches to registered providers
const logger = require('../logger');
const WebDAVProvider = require('./providers/webdav');
const FolderProvider = require('./providers/folder');

let provider = null;
let syncTimer = null;
let syncConfig = { mode: 'none', interval: 15 };

// provider constructors
const providers = {
  webdav: (cfg) => new WebDAVProvider(cfg),
  folder: (cfg) => new FolderProvider(cfg)
};

function getProvider() {
  return provider;
}

function resetProvider() {
  provider = null;
  stopAutoSync();
}

function createProvider(config) {
  const factory = providers[config.mode];
  if (!factory) return null;
  return factory(config);
}

async function testConnection(config) {
  const p = createProvider(config);
  if (!p) return { success: false, message: '不支持的同步方式' };
  return p.test();
}

async function pushVault(localPath) {
  if (!provider) throw new Error('同步方式未配置');
  return provider.push(localPath);
}

async function pullVault(localPath) {
  if (!provider) throw new Error('同步方式未配置');
  return provider.pull(localPath);
}

async function getRemoteInfo() {
  if (!provider) throw new Error('同步方式未配置');
  return provider.getInfo();
}

function startAutoSync(getVaultPath, getWin) {
  if (!provider || syncConfig.mode === 'none') return;
  if (syncTimer) clearInterval(syncTimer);

  const ms = (syncConfig.interval || 15) * 60 * 1000;

  async function doSync() {
    try {
      const vaultPath = getVaultPath();
      if (!vaultPath || !require('fs').existsSync(vaultPath)) return;
      await provider.push(vaultPath);
      if (getWin()) {
        getWin().webContents.send('sync:status', { type: 'synced', time: new Date().toISOString() });
      }
    } catch (e) {
      logger.sync('ERROR', e.message);
      if (getWin()) {
        getWin().webContents.send('sync:status', { type: 'error', message: e.message });
      }
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

function getConfig() {
  return { ...syncConfig };
}

// register new providers at runtime (for extensibility)
function registerProvider(name, factory) {
  providers[name] = factory;
}

module.exports = {
  testConnection, pushVault, pullVault, getRemoteInfo,
  startAutoSync, stopAutoSync, updateConfig, getConfig,
  getProvider, registerProvider
};
