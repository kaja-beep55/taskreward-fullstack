// ============================================================
// Reusable UI components + helpers (framework-free).
// ============================================================
import { THUMB_THEMES } from './data.js';
import { whatsappLink } from './config.js';

export function escapeHtml(str = '') {
  return String(str)
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;').replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d) ? iso : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function badge(status, label) {
  const cls = String(status).toLowerCase().replaceAll(' ', '-');
  return `<span class="badge badge-${cls}">${escapeHtml(label || status)}</span>`;
}

export function avatarHtml(name, small = false) {
  const initials = String(name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('');
  return `<div class="avatar ${small ? 'avatar-sm' : ''}" aria-hidden="true">${escapeHtml(initials)}</div>`;
}

export function thumbHtml(task, extraClass = '') {
  if (task.image_url || task.imageData) {
    return `<div class="task-thumb ${extraClass}" style="padding:0;overflow:hidden"><img src="${task.image_url || task.imageData}" alt="${escapeHtml(task.title)}" style="width:100%;height:100%;object-fit:cover"></div>`;
  }
  const theme = THUMB_THEMES[task.theme] || THUMB_THEMES.default;
  return `<div class="task-thumb ${extraClass}" style="background:${theme.bg}" aria-hidden="true">${theme.emoji}</div>`;
}

// ---------- Task card ----------
export function taskCardHtml(task) {
  return `
  <article class="task-card">
    ${thumbHtml(task)}
    <div class="task-body">
      <div class="task-title-row">
        <h3 class="task-title">${escapeHtml(task.title)}</h3>
        ${badge(task.status)}
      </div>
      <p class="task-desc">${escapeHtml(task.short_desc || task.shortDesc)}</p>
      <div class="task-meta">
        <span class="reward">🪙 ${task.reward_coins || task.reward} Coins</span>
        <a class="btn btn-primary btn-sm" href="#/tasks/${task.id}">DETAILS</a>
      </div>
    </div>
  </article>`;
}

// ---------- States ----------
export function loadingHtml(text = 'Loading…') {
  return `<div class="state-box" role="status"><div class="spinner" aria-hidden="true"></div><p>${escapeHtml(text)}</p></div>`;
}

export function skeletonGridHtml(count = 4) {
  return `<div class="task-grid">${Array.from({ length: count }, () => '<div class="skeleton" aria-hidden="true"></div>').join('')}</div>`;
}

export function emptyStateHtml({ icon = '📭', title = 'Nothing here yet', message = '', actionHtml = '' }) {
  return `
  <div class="state-box">
    <div class="state-icon" aria-hidden="true">${icon}</div>
    <h3>${escapeHtml(title)}</h3>
    ${message ? `<p>${escapeHtml(message)}</p>` : ''}
    ${actionHtml ? `<div class="mt-16">${actionHtml}</div>` : ''}
  </div>`;
}

export function errorStateHtml({ icon = '⚠️', title = 'Something went wrong', message = 'Please try again.', actionHtml = '' }) {
  return `
  <div class="state-box" role="alert">
    <div class="state-icon" aria-hidden="true">${icon}</div>
    <h3>${escapeHtml(title)}</h3>
    <p>${escapeHtml(message)}</p>
    ${actionHtml ? `<div class="mt-16">${actionHtml}</div>` : ''}
  </div>`;
}

// ---------- Toast ----------
export function showToast(message, type = '') {
  const root = document.getElementById('toast-root');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  root.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; }, 2600);
  setTimeout(() => el.remove(), 3000);
}

// ---------- Confirmation modal ----------
export function openConfirm({ title, message, confirmText = 'CONFIRM', danger = false }) {
  return new Promise((resolve) => {
    const root = document.getElementById('modal-root');
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <h3 id="modal-title">${escapeHtml(title)}</h3>
        <p>${escapeHtml(message)}</p>
        <div class="btn-row">
          <button class="btn btn-outline" data-modal="cancel">CANCEL</button>
          <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-modal="confirm">${escapeHtml(confirmText)}</button>
        </div>
      </div>`;
    root.appendChild(backdrop);
    const close = (val) => { backdrop.remove(); document.removeEventListener('keydown', onKey); resolve(val); };
    const onKey = (e) => { if (e.key === 'Escape') close(false); };
    document.addEventListener('keydown', onKey);
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) close(false);
      const action = e.target.closest('[data-modal]')?.dataset.modal;
      if (action === 'confirm') close(true);
      if (action === 'cancel') close(false);
    });
    backdrop.querySelector('[data-modal="confirm"]').focus();
  });
}

// ---------- WhatsApp ----------
export function openWhatsApp() {
  // Direct wa.me chat link only — no Business API, no automation.
  window.open(whatsappLink(), '_blank', 'noopener');
}

export function whatsappSupportCardHtml() {
  return `
  <div class="wa-support-card mt-24">
    <div style="font-size:2rem" aria-hidden="true">💬</div>
    <div class="grow" style="flex:1">
      <strong>Need help or submitting a task?</strong>
      <p class="text-muted" style="margin-top:2px">Send your task-completion video to the administrator on WhatsApp.</p>
    </div>
    <button class="btn btn-whatsapp btn-sm" data-action="open-whatsapp">WhatsApp</button>
  </div>`;
}

// ---------- Coin transaction item ----------
export function txItemHtml(tx, userName) {
  const sign = tx.delta >= 0 ? '+' : '−';
  const cls = tx.delta >= 0 ? 'plus' : 'minus';
  return `
  <div class="list-item">
    <div class="grow">
      <div class="title">${escapeHtml(tx.reason)}</div>
      <div class="sub">${escapeHtml(tx.date)}${userName ? ` · ${escapeHtml(userName)}` : ''} · ${escapeHtml(tx.type)} · by ${escapeHtml(tx.admin)}</div>
    </div>
    <span class="tx-delta ${cls}">${sign}${Math.abs(tx.delta)} 🪙</span>
  </div>`;
}
