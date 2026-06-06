const electron = require('electron');
const fs = require('fs');
const path = require('path');

const DEFAULTS = {
  language: 'zh-CN',
  theme: 'light',
  autoLockMinutes: 30,
  loginAttemptLimit: 5,
  passwordRevealSeconds: 3,
  clipboardClearMinutes: 1,
  logEnabled: true,
  storagePath: '',
  syncMode: 'none',
  webdav: { url: '', username: '', encryptedPassword: '' },
  folderSync: { path: '' },
  keyboardShortcuts: {
    search: 'Ctrl+F',
    newEntry: 'Ctrl+N',
    deleteEntry: '',
    lock: '',
    quit: ''
  },
  columnWidths: {},
  closeBehavior: 'ask',
  windowBounds: { width: 900, height: 620 }
};

let settings = null;
let _settingsPath = null;

function getSettingsPath() {
  if (_settingsPath) return _settingsPath;
  _settingsPath = path.join(electron.app.getPath('userData'), 'settings.json');
  return _settingsPath;
}

function load() {
  try {
    const sp = getSettingsPath();
    if (fs.existsSync(sp)) {
      const raw = fs.readFileSync(sp, 'utf8');
      settings = { ...DEFAULTS, ...JSON.parse(raw) };
    } else {
      settings = { ...DEFAULTS };
      save();
    }
  } catch (e) {
    settings = { ...DEFAULTS };
  }
  return settings;
}

function save() {
  const sp = getSettingsPath();
  const dir = path.dirname(sp);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(sp, JSON.stringify(settings, null, 2), 'utf8');
}

function get(key) {
  if (!settings) load();
  return key ? settings[key] : settings;
}

function set(key, value) {
  if (!settings) load();
  settings[key] = value;
  save();
}

function getAll() {
  if (!settings) load();
  return { ...settings };
}

function reset() {
  settings = { ...DEFAULTS };
  try { fs.unlinkSync(getSettingsPath()); } catch (e) {}
}

module.exports = { load, save, get, set, getAll, reset, DEFAULTS, getSettingsPath };
