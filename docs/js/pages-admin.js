// ============================================================
// ADMIN PAGES — all data operations are MOCK frontend state.
// Phase 3+: real auth, RLS-protected queries, audit logs.
// ============================================================
import { DISTRICTS } from './config.js';
import { settingsService } from './bridge.js';
import {
  adminService, taskService, userService, coinService,
  submissionService, storageService,
} from './bridge.js';
import {
  escapeHtml, badge, avatarHtml, thumbHtml, loadingHtml, emptyStateHtml,
  errorStateHtml, showToast, openConfirm, txItemHtml, formatDate,
} from './ui.js';

function districtOptions(selected = '') {
  return DISTRICTS.map(
    (d) => `<option value="${d}" ${d === selected ? 'selected' : ''}>${d}</option>`
  ).join('');
}

// ============================================================
// ADMIN LOGIN  (#/admin/login)
// UI ONLY — the password is never stored or verified here.
// Phase 3: secure server-side authentication.
// ============================================================
export async function AdminLoginPage() {
  return {
    title: 'Admin Login',
    bare: true,
    html: `
      <div class="card form-card mt-24">
        <div class="text-center mb-16">
          <div style="font-size:2.4rem" aria-hidden="true">🛡️</div>
          <h2 style="font-size:1.3rem;font-weight:800">ADMIN PANEL</h2>
          <p class="text-muted mt-8">Enter the 10-digit administrator password.</p>
          <p class="mt-8"><span class="demo-tag">Demo build — any 10 characters work</span></p>
        </div>
        <form id="admin-login-form" novalidate>
          <div class="field">
            <label for="admin-password">Admin Password</label>
            <input id="admin-password" name="password" type="password" inputmode="numeric"
                   maxlength="10" minlength="10" required placeholder="__________"
                   autocomplete="off" aria-describedby="pw-counter">
            <div class="char-counter" id="pw-counter">0 / 10</div>
          </div>
          <div class="btn-row">
            <a class="btn btn-outline" href="#/">BACK</a>
            <button class="btn btn-primary" type="submit">LOGIN</button>
          </div>
        </form>
      </div>
    `,
    mount(root) {
      const input = root.querySelector('#admin-password');
      const counter = root.querySelector('#pw-counter');
      input.addEventListener('input', () => {
        counter.textContent = `${input.value.length} / 10`;
        counter.classList.toggle('complete', input.value.length === 10);
      });
      const form = root.querySelector('#admin-login-form');
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          await adminService.login(input.value);
          showToast('Admin login successful (demo).', 'success');
          location.hash = '#/admin';
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    },
  };
}

// ============================================================
// ADMIN DASHBOARD  (#/admin)
// ============================================================
export async function AdminDashboardPage() {
  return {
    title: 'Admin Dashboard',
    html: `<div id="admin-dash">${loadingHtml('Loading dashboard…')}</div>`,
    async mount(root) {
      const container = root.querySelector('#admin-dash');
      const [users, tasks, pending] = await Promise.all([
        userService.getUsers(),
        taskService.getAllTasks(),
        submissionService.getPending(),
      ]);
      const activeUsers = users.filter((u) => u.status === 'active').length;
      const totalIssued = coinService.getTotalIssued();

      container.innerHTML = `
        <div class="admin-stats">
          <div class="admin-stat"><div class="as-icon">👥</div><div class="as-value">${users.length}</div><div class="as-label">Total Users</div></div>
          <div class="admin-stat"><div class="as-icon">🟢</div><div class="as-value">${activeUsers}</div><div class="as-label">Active Users</div></div>
          <div class="admin-stat"><div class="as-icon">📋</div><div class="as-value">${tasks.length}</div><div class="as-label">Total Tasks</div></div>
          <div class="admin-stat"><div class="as-icon">🪙</div><div class="as-value">${totalIssued.toLocaleString()}</div><div class="as-label">Total Coins Issued</div></div>
        </div>

        <h3 class="section-title">Pending Reviews ${pending.length ? `<span class="badge badge-pending-review">${pending.length}</span>` : ''}</h3>
        <div id="pending-list">
          ${pending.length ? pending.map((s) => {
            const u = users.find((x) => x.id === s.userId);
            const t = tasks.find((x) => x.id === s.taskId);
            return `
            <div class="card mb-16" data-submission="${s.id}">
              <div class="list-item" style="border:none;padding:0;margin:0">
                ${avatarHtml(u ? u.name : '?', true)}
                <div class="grow">
                  <div class="title">${escapeHtml(u ? u.name : s.userId)}</div>
                  <div class="sub">Task: ${escapeHtml(t ? t.title : s.taskId)} · Submitted: ${escapeHtml(s.submittedAt)}</div>
                  <div class="mt-8">${badge('pending-review', 'Pending Review')}</div>
                </div>
              </div>
              <div class="btn-row mt-16">
                <a class="btn btn-outline btn-sm" href="#/admin/users/${s.userId}">VIEW USER</a>
                <button class="btn btn-primary btn-sm" data-action="approve-submission" data-id="${s.id}">MARK APPROVED</button>
                <button class="btn btn-danger-outline btn-sm" data-action="reject-submission" data-id="${s.id}">MARK REJECTED</button>
              </div>
            </div>`;
          }).join('') : emptyStateHtml({
            icon: '🎉',
            title: 'No pending reviews',
            message: 'All submissions have been reviewed.',
          })}
        </div>
      `;
    },
  };
}

// ============================================================
// ADMIN TASK MANAGEMENT  (#/admin/tasks)
// ============================================================
export async function AdminTasksPage() {
  return {
    title: 'Task Management',
    html: `<div id="admin-tasks">${loadingHtml('Loading tasks…')}</div>`,
    async mount(root) {
      const container = root.querySelector('#admin-tasks');
      const tasks = await taskService.getAllTasks();
      container.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:14px">
          <h3 class="section-title" style="margin:0">Task Management</h3>
          <a class="btn btn-primary btn-sm" href="#/admin/tasks/new">＋ ADD TASK</a>
        </div>
        ${tasks.length ? tasks.map((t) => `
          <div class="admin-task-row">
            ${thumbHtml(t)}
            <div class="grow" style="flex:1;min-width:0">
              <div class="title" style="font-weight:700">${escapeHtml(t.title)}</div>
              <div class="sub text-muted">Reward: ${t.reward} Coins · ${badge(t.status)}</div>
            </div>
            <div class="actions">
              <a class="btn btn-outline btn-sm" href="#/admin/tasks/${t.id}/edit">EDIT</a>
              <button class="btn btn-danger-outline btn-sm" data-action="archive-task" data-id="${t.id}" data-title="${escapeHtml(t.title)}" ${t.status === 'archived' ? 'disabled' : ''}>ARCHIVE</button>
            </div>
          </div>`).join('') : emptyStateHtml({
            icon: '📋',
            title: 'No tasks yet',
            message: 'Create your first task to get started.',
            actionHtml: '<a class="btn btn-primary" href="#/admin/tasks/new">＋ ADD TASK</a>',
          })}
      `;
    },
  };
}

// ============================================================
// ADD / EDIT TASK FORM  (#/admin/tasks/new, #/admin/tasks/:id/edit)
// ============================================================
export async function AdminTaskFormPage(taskId) {
  const isEdit = Boolean(taskId);
  const task = isEdit ? await taskService.getTaskById(taskId) : null;
  if (isEdit && !task) {
    return {
      title: 'Edit Task',
      html: errorStateHtml({
        icon: '🔍', title: 'Task not found', message: 'This task does not exist.',
        actionHtml: '<a class="btn btn-primary" href="#/admin/tasks">BACK TO TASKS</a>',
      }),
    };
  }

  const v = (key, fallback = '') => (task ? escapeHtml(task[key] ?? fallback) : fallback);
  const listVal = (key) => (task && Array.isArray(task[key]) ? escapeHtml(task[key].join('\n')) : '');
  const settings = settingsService.getAll();
  const defaultStatus = task ? task.status : settings.defaultTaskStatus;

  return {
    title: isEdit ? 'Edit Task' : 'Add Task',
    html: `
      <div class="card form-card">
        <h2 style="font-size:1.2rem;font-weight:800" class="mb-16">${isEdit ? 'Edit Task' : 'Add New Task'}</h2>
        <form id="task-form" data-edit-id="${isEdit ? task.id : ''}" novalidate>
          <div class="field">
            <label for="tf-title">Task Title</label>
            <input id="tf-title" name="title" type="text" required maxlength="120" value="${v('title')}">
          </div>
          <div class="field">
            <label for="tf-image">Task Image</label>
            <label class="upload-box" for="tf-image" id="upload-label">
              <span aria-hidden="true" style="font-size:1.6rem">🖼️</span><br>
              Tap to upload image (local preview only in this phase)
            </label>
            <input id="tf-image" name="image" type="file" accept="image/*" style="display:none">
            <input type="hidden" name="imageData" id="tf-imageData" value="">
            <div class="upload-preview" id="upload-preview" style="display:none"></div>
            <div class="hint">Phase 2: uploads to secure cloud storage. Nothing is uploaded now.</div>
          </div>
          <div class="field">
            <label for="tf-short">Short Description</label>
            <input id="tf-short" name="shortDesc" type="text" required maxlength="160" value="${v('shortDesc')}">
          </div>
          <div class="field">
            <label for="tf-full">Full Description</label>
            <textarea id="tf-full" name="fullDesc" required>${v('fullDesc')}</textarea>
          </div>
          <div class="field">
            <label for="tf-todo">What To Do <span class="hint">(one step per line)</span></label>
            <textarea id="tf-todo" name="whatToDo" required>${listVal('whatToDo')}</textarea>
          </div>
          <div class="field">
            <label for="tf-nottodo">What Not To Do <span class="hint">(one rule per line)</span></label>
            <textarea id="tf-nottodo" name="whatNotToDo" required>${listVal('whatNotToDo')}</textarea>
          </div>
          <div class="field">
            <label for="tf-req">Important Requirements</label>
            <textarea id="tf-req" name="requirements" style="min-height:70px">${v('requirements')}</textarea>
          </div>
          <div class="field">
            <label for="tf-url">Target URL</label>
            <input id="tf-url" name="targetUrl" type="url" required placeholder="https://" value="${v('targetUrl')}">
          </div>
          <div class="field">
            <label for="tf-reward">Reward Coins</label>
            <input id="tf-reward" name="reward" type="number" min="1" max="100000" required value="${task ? task.reward_coins || task.reward : ''}">
          </div>
          <div class="field">
            <label for="tf-time">Estimated Time</label>
            <input id="tf-time" name="estTime" type="text" placeholder="e.g. 5 min" value="${v('estTime')}">
          </div>
          <div class="field">
            <label for="tf-status">Task Status</label>
            <select id="tf-status" name="status">
              ${['draft', 'published', 'archived'].map((s) => `<option value="${s}" ${s === defaultStatus ? 'selected' : ''}>${s[0].toUpperCase() + s.slice(1)}</option>`).join('')}
            </select>
          </div>
          <div class="btn-row">
            <a class="btn btn-outline" href="#/admin/tasks">CANCEL</a>
            ${isEdit
              ? '<button class="btn btn-primary" type="submit" data-save="published">SAVE CHANGES</button>'
              : '<button class="btn btn-outline" type="submit" data-save="draft">SAVE DRAFT</button><button class="btn btn-primary" type="submit" data-save="published">PUBLISH TASK</button>'}
          </div>
        </form>
      </div>
    `,
    mount(root) {
      const fileInput = root.querySelector('#tf-image');
      const preview = root.querySelector('#upload-preview');
      const hidden = root.querySelector('#tf-imageData');
      fileInput.addEventListener('change', async () => {
        try {
          const dataUrl = await storageService.readFileAsDataUrl(fileInput.files[0]);
          hidden.value = dataUrl;
          preview.style.display = 'block';
          preview.innerHTML = `<img src="${dataUrl}" alt="Task image preview">`;
        } catch (err) {
          showToast(err.message, 'error');
        }
      });

      const form = root.querySelector('#task-form');
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        const data = {
          title: String(fd.get('title') || '').trim(),
          shortDesc: String(fd.get('shortDesc') || '').trim(),
          fullDesc: String(fd.get('fullDesc') || '').trim(),
          whatToDo: String(fd.get('whatToDo') || '').split('\n').map((s) => s.trim()).filter(Boolean),
          whatNotToDo: String(fd.get('whatNotToDo') || '').split('\n').map((s) => s.trim()).filter(Boolean),
          requirements: String(fd.get('requirements') || '').trim(),
          targetUrl: String(fd.get('targetUrl') || '').trim(),
          reward: Number(fd.get('reward')) || 0,
          estTime: String(fd.get('estTime') || '').trim(),
          imageData: String(fd.get('imageData') || '') || null,
        };
        if (!data.title || !data.shortDesc || !data.fullDesc || !data.targetUrl || !data.reward) {
          showToast('Please fill in all required fields.', 'error');
          return;
        }
        if (!data.whatToDo.length || !data.whatNotToDo.length) {
          showToast('Please add at least one instruction and one rule.', 'error');
          return;
        }
        const saveMode = e.submitter?.dataset.save || 'draft';
        const status = isEdit ? String(fd.get('status')) : (saveMode === 'published' ? 'published' : 'draft');
        const editId = form.dataset.editId;
        if (editId) {
          await taskService.updateTask(editId, { ...data, status });
          showToast('Task updated (demo).', 'success');
        } else {
          await taskService.createTask(data, status);
          showToast(status === 'published' ? 'Task published (demo).' : 'Draft saved (demo).', 'success');
        }
        location.hash = '#/admin/tasks';
      });
    },
  };
}

// ============================================================
// ADMIN USERS  (#/admin/users)
// ============================================================
export async function AdminUsersPage() {
  return {
    title: 'Users',
    html: `
      <div id="users-summary"></div>
      <div class="search-bar">
        <span class="search-icon" aria-hidden="true">🔎</span>
        <input id="user-search" type="search" placeholder="Search by name, user ID or district" aria-label="Search users">
      </div>
      <div id="users-list">${loadingHtml('Loading users…')}</div>
    `,
    async mount(root) {
      const listEl = root.querySelector('#users-list');
      const summaryEl = root.querySelector('#users-summary');
      const searchEl = root.querySelector('#user-search');

      async function renderList(query = '') {
        const users = query ? await userService.searchUsers(query) : await userService.getUsers();
        summaryEl.innerHTML = `<h3 class="section-title" style="margin-top:4px">Total Users: ${users.length}</h3>`;
        if (!users.length) {
          listEl.innerHTML = emptyStateHtml({
            icon: '🔍',
            title: 'No search results',
            message: `No users match "${query}". Try a different search.`,
          });
          return;
        }
        listEl.innerHTML = users.map((u) => {
          const balance = coinService.getBalance(u.id);
          return `
          <a class="list-item clickable" href="#/admin/users/${u.id}" style="color:inherit">
            ${avatarHtml(u.name, true)}
            <div class="grow">
              <div class="title">${escapeHtml(u.name)}</div>
              <div class="sub">${escapeHtml(u.district)} · ${escapeHtml(u.id)} · 🪙 ${balance}</div>
            </div>
            ${badge(u.status)}
          </a>`;
        }).join('');
      }

      let debounce;
      searchEl.addEventListener('input', () => {
        clearTimeout(debounce);
        debounce = setTimeout(() => renderList(searchEl.value), 250);
      });
      await renderList();
    },
  };
}

// ============================================================
// ADMIN USER DETAIL  (#/admin/users/:id)
// ============================================================
export async function AdminUserDetailPage(userId) {
  return {
    title: 'User Details',
    html: `<div id="user-detail">${loadingHtml('Loading user…')}</div>`,
    async mount(root) {
      const container = root.querySelector('#user-detail');
      const user = await userService.getUserById(userId);
      if (!user) {
        container.innerHTML = errorStateHtml({
          icon: '🔍', title: 'User not found', message: 'No user exists with this ID.',
          actionHtml: '<a class="btn btn-primary" href="#/admin/users">BACK TO USERS</a>',
        });
        return;
      }
      const balance = coinService.getBalance(user.id);
      const counts = await submissionService.getCounts(user.id);
      const history = await coinService.getHistory(user.id);
      const isBlocked = user.status === 'blocked';

      container.innerHTML = `
        <div class="card">
          <div class="profile-head">
            ${avatarHtml(user.name)}
            <div>
              <h2 style="font-size:1.2rem;font-weight:800">${escapeHtml(user.name)}</h2>
              <p class="text-muted">${escapeHtml(user.district)} · ${escapeHtml(user.id)}</p>
              <div class="mt-8">${badge(user.status)}</div>
            </div>
          </div>
          <div class="mt-16">
            <div class="info-line"><span class="label">Current Coins</span><span class="value">🪙 ${balance}</span></div>
            <div class="info-line"><span class="label">Completed Tasks</span><span class="value">${counts.completed}</span></div>
            <div class="info-line"><span class="label">Pending Tasks</span><span class="value">${counts.pending}</span></div>
            <div class="info-line"><span class="label">Last Active</span><span class="value">${escapeHtml(user.lastActive)}</span></div>
            <div class="info-line"><span class="label">Profile Created</span><span class="value">${formatDate(user.createdAt)}</span></div>
          </div>
          <div class="btn-row mt-16">
            <button class="btn btn-outline btn-sm" data-action="edit-user" data-id="${user.id}">✏️ EDIT PROFILE</button>
            <button class="btn btn-outline btn-sm" data-action="logout-user" data-id="${user.id}" data-name="${escapeHtml(user.name)}">↩ LOG OUT USER</button>
            ${isBlocked
              ? `<button class="btn btn-primary btn-sm" data-action="unblock-user" data-id="${user.id}" data-name="${escapeHtml(user.name)}">UNBLOCK USER</button>`
              : `<button class="btn btn-danger btn-sm" data-action="block-user" data-id="${user.id}" data-name="${escapeHtml(user.name)}">BLOCK USER</button>`}
          </div>
        </div>

        <div class="card mt-16" id="edit-user-card" style="display:none">
          <h3 class="section-title" style="margin-top:0">Edit User Profile</h3>
          <form id="admin-edit-user-form" data-id="${user.id}" novalidate>
            <div class="field">
              <label for="eu-name">Name</label>
              <input id="eu-name" name="name" type="text" value="${escapeHtml(user.name)}" required maxlength="60">
            </div>
            <div class="field">
              <label for="eu-district">District</label>
              <select id="eu-district" name="district">${districtOptions(user.district)}</select>
            </div>
            <div class="btn-row">
              <button class="btn btn-outline" type="button" data-action="edit-user-cancel">CANCEL</button>
              <button class="btn btn-primary" type="submit">SAVE CHANGES</button>
            </div>
          </form>
        </div>

        <div class="card mt-16">
          <h3 class="section-title" style="margin-top:0">Add Coins</h3>
          <div class="info-line"><span class="label">Current Balance</span><span class="value">🪙 ${balance}</span></div>
          <form id="add-coins-form" data-id="${user.id}" data-name="${escapeHtml(user.name)}" class="mt-16" novalidate>
            <div class="field">
              <label for="ac-amount">Add Coins</label>
              <input id="ac-amount" name="amount" type="number" min="1" max="100000" required placeholder="50">
            </div>
            <div class="field">
              <label for="ac-reason">Reason</label>
              <input id="ac-reason" name="reason" type="text" required maxlength="140" placeholder="Task #102 verified">
            </div>
            <button class="btn btn-primary btn-block" type="submit">ADD COINS</button>
            <p class="hint mt-8">Demo only — Phase 5 runs this through a secure server-side function.</p>
          </form>
        </div>

        <h3 class="section-title">Coin History</h3>
        <div id="coin-history">
          ${history.length ? history.map((tx) => txItemHtml(tx)).join('') : emptyStateHtml({
            icon: '🪙', title: 'No coin history', message: 'Coin transactions for this user will appear here.',
          })}
        </div>
      `;

      const editCard = container.querySelector('#edit-user-card');
      container.querySelector('[data-action="edit-user"]').addEventListener('click', () => {
        editCard.style.display = editCard.style.display === 'none' ? 'block' : 'none';
      });
      container.querySelector('[data-action="edit-user-cancel"]').addEventListener('click', () => {
        editCard.style.display = 'none';
      });
      container.querySelector('#admin-edit-user-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const name = String(fd.get('name') || '').trim();
        const district = String(fd.get('district') || '');
        if (name.length < 2 || !district) { showToast('Please fill in all fields.', 'error'); return; }
        await userService.updateUser(user.id, { name, district });
        showToast('User profile updated (demo).', 'success');
        rerender();
      });
      container.querySelector('#add-coins-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const amount = Number(fd.get('amount'));
        const reason = String(fd.get('reason') || '').trim();
        if (!amount || amount < 1) { showToast('Enter a valid coin amount.', 'error'); return; }
        if (!reason) { showToast('Please enter a reason.', 'error'); return; }
        const ok = await openConfirm({
          title: 'Add Coins',
          message: `Add ${amount} coins to ${user.name}'s account? (${balance} → ${balance + amount} Coins)`,
          confirmText: 'CONFIRM',
        });
        if (!ok) return;
        await coinService.adminAddCoins('Admin', user.id, amount, reason);
        showToast(`${amount} coins added to ${user.name} (demo).`, 'success');
        rerender();
      });
    },
  };
}

function rerender() {
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

// ============================================================
// COIN MANAGEMENT  (#/admin/coins)
// ============================================================
export async function AdminCoinsPage() {
  return {
    title: 'Coin Management',
    html: `
      <h3 class="section-title" style="margin-top:4px">Coin Management</h3>
      <p class="text-muted mb-16">Search a user to open their profile and add coins manually.</p>
      <div class="search-bar">
        <span class="search-icon" aria-hidden="true">🔎</span>
        <input id="coin-user-search" type="search" placeholder="Search by name or user ID" aria-label="Search users for coin management">
      </div>
      <div id="coin-users-list">${emptyStateHtml({ icon: '👆', title: 'Search for a user', message: 'Type a name or user ID above to begin.' })}</div>
    `,
    mount(root) {
      const searchEl = root.querySelector('#coin-user-search');
      const listEl = root.querySelector('#coin-users-list');
      let debounce;
      searchEl.addEventListener('input', () => {
        clearTimeout(debounce);
        debounce = setTimeout(async () => {
          const q = searchEl.value.trim();
          if (!q) {
            listEl.innerHTML = emptyStateHtml({ icon: '👆', title: 'Search for a user', message: 'Type a name or user ID above to begin.' });
            return;
          }
          const users = await userService.searchUsers(q);
          if (!users.length) {
            listEl.innerHTML = emptyStateHtml({ icon: '🔍', title: 'No search results', message: `No users match "${q}".` });
            return;
          }
          listEl.innerHTML = users.map((u) => `
            <a class="list-item clickable" href="#/admin/users/${u.id}" style="color:inherit">
              ${avatarHtml(u.name, true)}
              <div class="grow">
                <div class="title">${escapeHtml(u.name)}</div>
                <div class="sub">${escapeHtml(u.id)} · Balance: 🪙 ${coinService.getBalance(u.id)}</div>
              </div>
              <span class="btn btn-primary btn-sm">ADD COINS</span>
            </a>`).join('');
        }, 250);
      });
    },
  };
}

// ============================================================
// COIN HISTORY  (#/admin/coin-history)
// ============================================================
export async function AdminCoinHistoryPage() {
  return {
    title: 'Coin History',
    html: `<div id="coin-history-root">${loadingHtml('Loading coin history…')}</div>`,
    async mount(root) {
      const container = root.querySelector('#coin-history-root');
      const [txs, users] = await Promise.all([coinService.getAllTransactions(), userService.getUsers()]);
      const userMap = Object.fromEntries(users.map((u) => [u.id, u.name]));
      if (!txs.length) {
        container.innerHTML = emptyStateHtml({ icon: '🪙', title: 'No coin history', message: 'Coin transactions will appear here.' });
        return;
      }
      container.innerHTML = `
        <h3 class="section-title" style="margin-top:4px">Coin History</h3>
        ${txs.map((tx) => txItemHtml(tx, userMap[tx.userId] || tx.userId)).join('')}
      `;
    },
  };
}

// ============================================================
// ADMIN SETTINGS  (#/admin/settings)
// ============================================================
export async function AdminSettingsPage() {
  const s = settingsService.getAll();
  return {
    title: 'Settings',
    html: `
      <div class="card form-card">
        <h3 class="section-title" style="margin-top:0">Settings</h3>
        <form id="settings-form" novalidate>
          <div class="field">
            <label for="st-wa">WhatsApp Number</label>
            <input id="st-wa" name="whatsappNumber" type="text" inputmode="numeric" value="${escapeHtml(s.whatsappNumber)}" placeholder="Country code + number, e.g. 91XXXXXXXXXX">
            <div class="hint">Used for direct wa.me chat links. No API keys involved. Phase 6 connects the real number.</div>
          </div>
          <div class="field">
            <label for="st-name">Application Name</label>
            <input id="st-name" name="appName" type="text" value="${escapeHtml(s.appName)}" maxlength="60">
          </div>
          <div class="field">
            <label for="st-status">Default Task Status</label>
            <select id="st-status" name="defaultTaskStatus">
              ${['draft', 'published'].map((x) => `<option value="${x}" ${x === s.defaultTaskStatus ? 'selected' : ''}>${x[0].toUpperCase() + x.slice(1)}</option>`).join('')}
            </select>
          </div>
          <button class="btn btn-primary btn-block" type="submit">SAVE SETTINGS</button>
          <p class="hint mt-8">Demo only — stored locally. Phase 2 saves these in the database.</p>
        </form>
      </div>
    `,
    mount(root) {
      const form = root.querySelector('#settings-form');
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        settingsService.save({
          whatsappNumber: String(fd.get('whatsappNumber') || '').replace(/\D/g, ''),
          appName: String(fd.get('appName') || '').trim() || 'TaskReward',
          defaultTaskStatus: String(fd.get('defaultTaskStatus')),
        });
        showToast('Settings saved (demo).', 'success');
      });
    },
  };
}

// ============================================================
// ADMIN ACTION HANDLERS (called from global event delegation)
// ============================================================
export async function handleArchiveTask(id, title) {
  const ok = await openConfirm({
    title: 'Archive this task?',
    message: `Are you sure you want to archive "${title}"? It will be hidden from users but not permanently deleted.`,
    confirmText: 'ARCHIVE',
    danger: true,
  });
  if (!ok) return;
  await taskService.archiveTask(id);
  showToast('Task archived (demo).', 'success');
  rerender();
}

export async function handleReview(submissionId, status) {
  const ok = await openConfirm({
    title: status === 'approved' ? 'Approve submission?' : 'Reject submission?',
    message: status === 'approved'
      ? 'Mark this submission as approved? Remember to add coins manually from Coin Management.'
      : 'Mark this submission as rejected?',
    confirmText: status === 'approved' ? 'MARK APPROVED' : 'MARK REJECTED',
    danger: status === 'rejected',
  });
  if (!ok) return;
  await submissionService.setStatus(submissionId, status);
  showToast(status === 'approved' ? 'Marked as approved (demo).' : 'Marked as rejected (demo).', 'success');
  rerender();
}

export async function handleBlockUser(id, name) {
  const ok = await openConfirm({
    title: 'Block this user?',
    message: `Block ${name} from accessing the platform? (UI state only — real enforcement comes with the backend.)`,
    confirmText: 'BLOCK USER',
    danger: true,
  });
  if (!ok) return;
  await userService.setUserStatus(id, 'blocked');
  showToast(`${name} is now BLOCKED (demo).`, 'success');
  rerender();
}

export async function handleUnblockUser(id, name) {
  const ok = await openConfirm({
    title: 'Unblock this user?',
    message: `Restore ${name}'s access to the platform?`,
    confirmText: 'UNBLOCK USER',
  });
  if (!ok) return;
  await userService.setUserStatus(id, 'active');
  showToast(`${name} is now ACTIVE (demo).`, 'success');
  rerender();
}

export async function handleLogoutUser(id, name) {
  const ok = await openConfirm({
    title: 'Log out this user?',
    message: `Are you sure you want to log ${name} out? (Simulated — real session invalidation comes with the backend.)`,
    confirmText: 'CONFIRM LOGOUT',
    danger: true,
  });
  if (!ok) return;
  // TODO Phase 3: call backend to revoke the user's sessions.
  showToast(`${name} has been logged out (simulated).`, 'success');
}

export async function handleAdminLogout() {
  const ok = await openConfirm({
    title: 'Exit admin panel?',
    message: 'You will need to log in again to access the admin panel.',
    confirmText: 'LOGOUT',
    danger: true,
  });
  if (!ok) return;
  await adminService.logout();
  showToast('Admin logged out (demo).', 'success');
  location.hash = '#/';
}
