const fs = require('fs');
const path = require('path');

let LOG_DIR = null;
let enabled = false;

function getLogDir() {
  if (LOG_DIR) return LOG_DIR;
  LOG_DIR = path.join(__dirname, '..', '..', 'logs');
  return LOG_DIR;
}

function ensureDir() {
  const dir = getLogDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function todayFile() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return path.join(getLogDir(), `${yyyy}-${mm}-${dd}.log`);
}

function timestamp() {
  return new Date().toISOString();
}

function write(level, source, message, data) {
  if (!enabled) return;
  try {
    ensureDir();
    const line = `[${timestamp()}] [${level}] [${source}] ${message}`;
    const extra = data ? ' | ' + JSON.stringify(data) : '';
    fs.appendFileSync(todayFile(), line + extra + '\n', 'utf8');
  } catch (e) {
  }
}

const logger = {
  setEnabled(val) { enabled = val; },
  getLogDir() { return getLogDir(); },

  info(source, message, data) { write('INFO', source, message, data); },
  warn(source, message, data) { write('WARN', source, message, data); },
  error(source, message, data) { write('ERROR', source, message, data); },
  debug(source, message, data) { write('DEBUG', source, message, data); },

  vault(method, detail) { write('VAULT', method, detail); },
  crypto(method, detail) { write('CRYPTO', method, detail); },
  sync(method, detail) { write('SYNC', 'SYNC', method, detail); },
  lock(method, detail) { write('LOCK', method, detail); },
  ipc(channel, detail) { write('IPC', channel, detail); }
};

module.exports = logger;
