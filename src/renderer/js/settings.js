const panels = {
  general: `
    <h3>通用</h3>
    <div class="setting-row"><label>语言</label><select id="setting-language"><option value="zh-CN">中文</option><option value="en-US">English</option></select></div>
    <div class="setting-row"><label>主题</label><select id="setting-theme"><option value="dark">深色</option><option value="light">浅色</option></select></div>
    <div class="setting-row"><label>调试日志</label><input type="checkbox" id="setting-log"></div>`,

  security: `
    <h3>安全</h3>
    <div class="setting-row"><label>修改主密码</label><button class="btn btn-small" id="setting-change-password">修改 →</button></div>
    <div class="setting-row"><label>恢复密钥</label><span class="key-hint" id="setting-key-hint">--------</span></div>
    <div class="setting-row"><label>重新生成密钥</label><button class="btn btn-small" id="setting-regenerate-key">重置 →</button></div>
    <div class="setting-row"><label>自动锁屏</label><select id="setting-auto-lock"><option value="5">5 分钟</option><option value="15">15 分钟</option><option value="30" selected>30 分钟</option><option value="60">1 小时</option><option value="120">2 小时</option><option value="0">永不</option></select></div>
    <div class="setting-row"><label>登录错误上限</label><select id="setting-login-limit"><option value="3">3次</option><option value="5" selected>5次</option><option value="7">7次</option><option value="11">11次</option><option value="99">自定义(最多99)</option></select></div>
    <div class="setting-row"><label>密码明文显示时长</label><select id="setting-reveal-duration"><option value="3" selected>3 秒</option><option value="5">5 秒</option><option value="10">10 秒</option><option value="30">30 秒</option><option value="0">永不隐藏</option></select></div>`,

  clipboard: `
    <h3>剪切板</h3>
    <div class="setting-row"><label>自动清除</label><select id="setting-clipboard"><option value="1" selected>1 分钟</option><option value="3">3 分钟</option><option value="5">5 分钟</option><option value="0">不清除</option></select></div>`,

  shortcuts: `
    <h3>快捷键</h3>
    <div class="setting-row"><label>搜索</label><input id="shortcut-search" value="Ctrl+F" class="shortcut-input" readonly></div>
    <div class="setting-row"><label>新建</label><input id="shortcut-new" value="Ctrl+N" class="shortcut-input" readonly></div>`,

  trash: `<h3>回收站</h3><div class="trash-list" id="trash-list"><p class="trash-empty">回收站为空</p></div>
    <button class="btn btn-small btn-danger" id="clear-trash-btn">清空回收站</button>`,

  vaults: `<h3>密码库管理</h3><div class="vault-list" id="vault-list"></div>
    <button class="btn btn-small" id="add-vault-btn">+ 新建密码库</button>`,

  sync: `
    <h3>同步</h3>
    <div class="setting-row"><label>同步方式</label><select id="setting-sync-mode"><option value="none">无</option><option value="webdav">WebDAV</option><option value="folder">本地文件夹</option></select></div>
    <div id="sync-webdav-config" style="display:none">
      <div class="setting-row"><input class="input" placeholder="WebDAV 地址" id="setting-webdav-url"></div>
      <div class="setting-row"><input class="input" placeholder="用户名" id="setting-webdav-user"></div>
      <div class="setting-row"><input type="password" class="input" placeholder="密码" id="setting-webdav-password"></div>
      <button class="btn btn-small" id="test-webdav-btn">测试连接</button>
    </div>
    <div id="sync-folder-config" style="display:none">
      <div class="setting-row"><input class="input" id="setting-folder-path" readonly><button class="btn btn-small" id="pick-folder-btn">浏览</button></div>
    </div>`,

  data: `
    <h3>数据管理</h3>
    <button class="btn btn-small" id="export-plain-btn">导出明文</button>
    <button class="btn btn-small" id="export-encrypted-btn">导出加密</button>
    <button class="btn btn-small" id="import-btn">导入密码库</button>`,

  storage: `
    <h3>存储</h3>
    <div class="setting-row"><label>密码库路径</label><span class="path-display" id="setting-storage-path"></span></div>
    <div class="setting-row"><button class="btn btn-small" id="setting-change-path">更改路径</button></div>`,

  about: `<h3>关于</h3><p>密码保管箱 v1.0.0</p>`
};

let activeCat = 'general';

function switchPanel(cat) {
  activeCat = cat;
  document.getElementById('settings-panel').innerHTML = panels[cat];
  document.querySelectorAll('.sidebar-item').forEach(s => s.classList.toggle('active', s.dataset.cat === cat));

  bindPanelEvents(cat);
}

function bindPanelEvents(cat) {
  if (cat === 'general') {
    document.getElementById('setting-language').value = settingsCache.language || 'zh-CN';
    document.getElementById('setting-theme').value = settingsCache.theme || 'light';
    document.getElementById('setting-log').checked = settingsCache.logEnabled || false;

    ['language', 'theme'].forEach(id => {
      document.getElementById('setting-' + id).addEventListener('change', async (e) => {
        const keyMap = { language: 'language', theme: 'theme' };
        await window.api.setSetting(keyMap[id], e.target.value);
        if (id === 'theme') {
          document.body.classList.remove('theme-dark', 'theme-light');
          document.body.classList.add('theme-' + e.target.value);
        }
        if (id === 'language') setLanguage(e.target.value);
      });
    });
    document.getElementById('setting-log').addEventListener('change', async (e) => {
      await window.api.toggleLog(e.target.checked);
      showToast(e.target.checked ? '日志已开启' : '日志已关闭');
    });
  }

  if (cat === 'security') {
    document.getElementById('setting-auto-lock').value = settingsCache.autoLockMinutes || 30;
    document.getElementById('setting-login-limit').value = settingsCache.loginAttemptLimit || 5;
    document.getElementById('setting-reveal-duration').value = settingsCache.passwordRevealSeconds || 3;
    if (state.recoveryKeyHint) {
      document.getElementById('setting-key-hint').textContent = state.recoveryKeyHint;
    }
    ['auto-lock', 'login-limit', 'reveal-duration'].forEach(id => {
      document.getElementById('setting-' + id).addEventListener('change', async (e) => {
        const keyMap = { 'auto-lock': 'autoLockMinutes', 'login-limit': 'loginAttemptLimit', 'reveal-duration': 'passwordRevealSeconds' };
        await window.api.setSetting(keyMap[id], parseInt(e.target.value));
      });
    });
    document.getElementById('setting-change-password').addEventListener('click', showChangePassword);
    document.getElementById('setting-regenerate-key').addEventListener('click', showRegenerateKey);
  }

  if (cat === 'clipboard') {
    document.getElementById('setting-clipboard').value = settingsCache.clipboardClearMinutes || 1;
    document.getElementById('setting-clipboard').addEventListener('change', async (e) => {
      await window.api.setSetting('clipboardClearMinutes', parseInt(e.target.value));
    });
  }

  if (cat === 'trash') {
    renderTrash();
    document.getElementById('clear-trash-btn').addEventListener('click', clearTrash);
  }

  if (cat === 'vaults') {
    renderVaultList();
    document.getElementById('add-vault-btn').addEventListener('click', showAddVault);
  }

  if (cat === 'sync') {
    document.getElementById('setting-sync-mode').value = settingsCache.syncMode || 'none';
    document.getElementById('setting-sync-mode').addEventListener('change', (e) => {
      const v = e.target.value;
      document.getElementById('sync-webdav-config').style.display = v === 'webdav' ? 'block' : 'none';
      document.getElementById('sync-folder-config').style.display = v === 'folder' ? 'block' : 'none';
      window.api.setSetting('syncMode', v);
    });
  }

  if (cat === 'data') {
    document.getElementById('export-plain-btn').addEventListener('click', exportPlain);
    document.getElementById('export-encrypted-btn').addEventListener('click', exportEncrypted);
    document.getElementById('import-btn').addEventListener('click', importFile);
  }

  if (cat === 'storage') {
    document.getElementById('setting-storage-path').textContent = settingsCache.storagePath || '未设置';
    document.getElementById('setting-change-path').addEventListener('click', showChangePath);
  }
}

let settingsCache = {};

async function initSettingsPage() {
  settingsCache = await window.api.getSettings();

  document.getElementById('settings-back-btn').addEventListener('click', () => showPage('main'));

  document.querySelectorAll('.sidebar-item').forEach(item => {
    item.addEventListener('click', () => switchPanel(item.dataset.cat));
  });

  switchPanel('general');
}
