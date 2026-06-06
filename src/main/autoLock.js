const { BrowserWindow } = require('electron');

class AutoLockTimer {
  constructor(getMainWindow) {
    this.getMainWindow = getMainWindow;
    this.timer = null;
    this.enabled = true;
    this.minutes = 30;
    this.onLock = null;
    this._onActivity = this._onActivity.bind(this);
  }

  start(minutes, onLock) {
    this.minutes = minutes;
    this.onLock = onLock;
    this.enabled = minutes > 0;
    this._reset();
    this._bindEvents();
  }

  stop() {
    this.enabled = false;
    if (this.timer) clearTimeout(this.timer);
    this._unbindEvents();
  }

  update(minutes) {
    this.minutes = minutes;
    this.enabled = minutes > 0;
    this._reset();
  }

  _reset() {
    if (this.timer) clearTimeout(this.timer);
    if (!this.enabled) return;
    this.timer = setTimeout(() => {
      if (this.onLock) this.onLock();
    }, this.minutes * 60 * 1000);
  }

  _onActivity() {
    this._reset();
  }

  _bindEvents() {
    const win = this.getMainWindow();
    if (win) {
      win.on('focus', this._onActivity);
    }
  }

  _unbindEvents() {
    const win = this.getMainWindow();
    if (win) {
      win.removeListener('focus', this._onActivity);
    }
  }
}

module.exports = AutoLockTimer;
