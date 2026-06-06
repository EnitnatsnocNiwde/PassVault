const i18n = {
  'zh-CN': {
    'lock.enterPassword': '请输入主密码解锁',
    'lock.passwordPlaceholder': '主密码',
    'lock.unlock': '解锁',
    'lock.or': '或',
    'lock.useRecoveryKey': '使用恢复密钥解锁',
    'lock.keyPlaceholder': '恢复密钥',
    'lock.verifyKey': '验证密钥',
    'lock.resetData': '重置所有数据 →',
    'lock.wrongPassword': '密码错误，剩余 {n} 次',
    'lock.cooldown': '已锁定，{n} 秒后重试',
    'lock.wrongKey': '密钥错误',
    'lock.noVault': '未找到密码库文件',

    'reset.warning': '⚠ 警告：此操作不可逆',
    'reset.desc1': '将清除主密码和所有软件设置',
    'reset.desc2': '密码库文件 (.pvault) 不会被删除',
    'reset.desc3': '如果密钥也丢失，将永久无法恢复',
    'reset.confirm': '我了解风险，确认重置',
    'reset.cancel': '取消',

    'setup.step1Title': '设置主密码',
    'setup.step1Hint': '至少4位，无复杂度要求。丢失无法恢复。',
    'setup.password': '主密码',
    'setup.confirmPassword': '确认主密码',
    'setup.step2Title': '设置恢复密钥',
    'setup.step2Warning': '密钥仅展示一次！请立即保存。若丢失，可在解锁后通过设置重新生成。',
    'setup.generateKey': '自动生成密钥',
    'setup.customKey': '自定义密钥（≥8位）',
    'setup.yourKey': '你的恢复密钥：',
    'setup.keySaved': '我已安全保存密钥，了解丢失无法恢复',
    'setup.step3Title': '选择存储位置',
    'setup.storagePath': '密码库存储路径',
    'setup.changePath': '浏览',
    'setup.storageHint': '存放在其他人无法访问的位置。不能使用已有文件的路径。',
    'setup.finish': '完成并进入',
    'setup.passwordMismatch': '两次密码不一致',
    'setup.passwordTooShort': '密码至少4位',
    'setup.keyTooShort': '密钥至少8位',
    'setup.pathExists': '该路径下已存在文件',

    'common.next': '下一步',
    'common.copy': '复制',
    'common.save': '保存',
    'common.cancel': '取消',
    'common.delete': '删除',
    'common.close': '关闭',

    'main.empty': '还没有密码，点击 + 添加第一条',
    'main.entries': '{n} 条记录',
    'main.copyToast': '已复制',
    'main.savedToast': '已保存',
    'main.deletedToast': '已移至回收站',

    'trash.empty': '回收站为空',
    'trash.restored': '已恢复',
    'trash.cleared': '回收站已清空',
    'settings.keyHint': '点击重置生成新密钥',
  },
  'en-US': {
    'lock.enterPassword': 'Enter master password to unlock',
    'lock.passwordPlaceholder': 'Master password',
    'lock.unlock': 'Unlock',
    'lock.or': 'or',
    'lock.useRecoveryKey': 'Unlock with recovery key',
    'lock.keyPlaceholder': 'Recovery key',
    'lock.verifyKey': 'Verify Key',
    'lock.resetData': 'Reset all data →',
    'lock.wrongPassword': 'Wrong password, {n} attempts remaining',
    'lock.cooldown': 'Locked, retry in {n}s',
    'lock.wrongKey': 'Wrong recovery key',
    'lock.noVault': 'Vault file not found',

    'reset.warning': '⚠ Warning: This action is irreversible',
    'reset.desc1': 'Will clear master password and all settings',
    'reset.desc2': 'Vault file (.pvault) will not be deleted',
    'reset.desc3': 'If recovery key is also lost, data is unrecoverable',
    'reset.confirm': 'I understand, reset now',
    'reset.cancel': 'Cancel',

    'setup.step1Title': 'Set Master Password',
    'setup.step1Hint': 'At least 4 characters. No complexity requirements. Lost = gone.',
    'setup.password': 'Master Password',
    'setup.confirmPassword': 'Confirm Password',
    'setup.step2Title': 'Set Recovery Key',
    'setup.step2Warning': 'Shown ONLY ONCE. Save immediately. Can regenerate while unlocked.',
    'setup.generateKey': 'Auto-generate key',
    'setup.customKey': 'Custom key (≥8 chars)',
    'setup.yourKey': 'Your recovery key:',
    'setup.keySaved': 'I have saved the key safely',
    'setup.step3Title': 'Choose Storage Location',
    'setup.storagePath': 'Vault file path',
    'setup.changePath': 'Browse',
    'setup.storageHint': 'Store where others cannot access. Cannot reuse existing files.',
    'setup.finish': 'Complete & Enter',
    'setup.passwordMismatch': 'Passwords do not match',
    'setup.passwordTooShort': 'Password must be at least 4 characters',
    'setup.keyTooShort': 'Key must be at least 8 characters',
    'setup.pathExists': 'File already exists at this path',

    'common.next': 'Next',
    'common.copy': 'Copy',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.close': 'Close',

    'main.empty': 'No entries yet. Click + Add',
    'main.entries': '{n} entries',
    'main.copyToast': 'Copied',
    'main.savedToast': 'Saved',
    'main.deletedToast': 'Moved to trash',

    'trash.empty': 'Trash is empty',
    'trash.restored': 'Restored',
    'trash.cleared': 'Trash cleared',
    'settings.keyHint': 'Reset to generate new key',
  }
};

let currentLang = 'zh-CN';

function t(key) {
  return (i18n[currentLang] && i18n[currentLang][key]) || key;
}

function setLanguage(lang) {
  currentLang = lang;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (el.tagName === 'INPUT' && el.type === 'submit') el.value = t(key);
    else el.textContent = t(key);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = t(el.getAttribute('data-i18n-placeholder'));
  });
}
