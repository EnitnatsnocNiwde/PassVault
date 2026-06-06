function renderTable(vaults, entries, searchQuery, searchFields, globalSearch) {
  const container = document.getElementById('main-table');
  const emptyEl = document.getElementById('main-empty');
  const countEl = document.getElementById('main-count');

  let filtered = filterEntries(entries, searchQuery, searchFields, globalSearch, vaults);
  container.innerHTML = '';

  if (filtered.length === 0) {
    emptyEl.style.display = 'flex';
    countEl.textContent = '0 entries';
    return;
  }
  emptyEl.style.display = 'none';

  const grouped = {};
  filtered.forEach(e => {
    e.vaultIds.forEach(vid => {
      if (!grouped[vid]) grouped[vid] = [];
      grouped[vid].push(e);
    });
  });

  vaults.forEach(vault => {
    const vaultEntries = grouped[vault.id] || [];
    if (!globalSearch && !vaultEntries.length) return;
    if (!globalSearch && !filtered.some(e => e.vaultIds.includes(vault.id))) return;

    const header = document.createElement('div');
    header.className = 'section-header';
    header.textContent = `── ${vault.name} ──`;
    container.appendChild(header);

    if (!vaultEntries.length && !globalSearch) {
      const empty = document.createElement('div');
      empty.className = 'table-row';
      empty.style.color = 'var(--text-muted)';
      empty.style.justifyContent = 'center';
      empty.textContent = '-- Empty vault --';
      empty.style.fontSize = '12px';
      container.appendChild(empty);
      return;
    }

    vaultEntries.forEach(entry => {
      const row = createTableRow(entry, vaults);
      container.appendChild(row);
    });
  });

  countEl.textContent = `${filtered.length} entries`;
}

function filterEntries(entries, query, fields, global, vaults) {
  if (!query) return entries;
  const q = query.toLowerCase();
  const activeFields = [];
  fields.website && activeFields.push('website');
  fields.alias && activeFields.push('alias');
  fields.account && activeFields.push('account');
  fields.password && activeFields.push('password');

  const passwordMode = fields.password && activeFields.length === 1;

  return entries.filter(e => {
    if (!fields.visible && !e.visible) return false;
    if (passwordMode) return (e.password || '').toLowerCase().includes(q);

    let matched = false;
    for (const f of activeFields) {
      if ((e[f] || '').toLowerCase().includes(q)) matched = true;
    }
    if (!matched && activeFields.length === 0) {
      for (const f of ['website', 'alias', 'account']) {
        if ((e[f] || '').toLowerCase().includes(q)) matched = true;
      }
    }
    return matched;
  });
}

function createTableRow(entry, vaults) {
  const row = document.createElement('div');
  row.className = 'table-row';
  row.setAttribute('data-id', entry.id);

  row.innerHTML = `
    <span class="col-id">${entry.id}</span>
    <span class="col-website">${escapeHtml(entry.website)}</span>
    <span class="col-alias">${escapeHtml(entry.alias)}</span>
    <span class="col-account">${escapeHtml(entry.account)}<button class="btn-icon copy-row-btn" data-text="${escapeAttr(entry.account)}" title="Copy">📋</button></span>
    <span class="col-password" data-pw="${escapeAttr(entry.password)}">****</span>
    <button class="btn-icon copy-row-btn" data-text="${escapeAttr(entry.password)}" title="Copy password">📋</button>
    <span class="col-vaults">${(entry.vaultIds||[]).map(vid => {
      const v = vaults.find(x => x.id === vid);
      return v ? `<span class="vault-tag">${escapeHtml(v.name)}</span>` : '';
    }).join('')}</span>
    <span class="col-description">${escapeHtml(entry.description || '-')}</span>
    <span class="col-drag" title="Long-press to drag">≡</span>
  `;

  row.querySelector('.col-password').addEventListener('click', async () => {
    const revealSec = (await window.api.getSettings()).passwordRevealSeconds || 3;
    const pwSpan = row.querySelector('.col-password');
    pwSpan.textContent = entry.password;
    if (revealSec > 0) {
      setTimeout(() => { pwSpan.textContent = '****'; }, revealSec * 1000);
    }
  });

  row.querySelectorAll('.copy-row-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const text = btn.getAttribute('data-text');
      await window.api.copyToClipboard(text, 1);
      showToast(t('main.copyToast'));
    });
  });

  return row;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

function escapeAttr(str) {
  return (str || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
