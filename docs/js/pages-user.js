// ============================================================
// USER PAGES
// ============================================================
import { DISTRICTS } from './config.js';
import { authService, taskService, coinService, submissionService } from './bridge.js';
import {
  escapeHtml, badge, avatarHtml, taskCardHtml, loadingHtml, skeletonGridHtml,
  emptyStateHtml, errorStateHtml, showToast, openConfirm, whatsappSupportCardHtml,
  formatDate,
} from './ui.js';

function districtOptions(selected = '') {
  return DISTRICTS.map(
    (d) => `<option value="${d}" ${d === selected ? 'selected' : ''}>${d}</option>`
  ).join('');
}

// ============================================================
// HOME / TASK DASHBOARD  (#/ and #/tasks)
// ============================================================
export async function HomePage() {
  return {
    title: 'Tasks',
    html: `
      <h2 class="section-title" style="margin-top:8px">Available Tasks</h2>
      <div id="task-feed">${skeletonGridHtml(4)}</div>
      ${whatsappSupportCardHtml()}
    `,
    async mount(root) {
      const feed = root.querySelector('#task-feed');
      try {
        const tasks = await taskService.getPublishedTasks();
        if (!tasks.length) {
          feed.innerHTML = emptyStateHtml({
            icon: '📭',
            title: 'No tasks available',
            message: 'New tasks are added regularly. Please check back soon.',
          });
          return;
        }
        feed.innerHTML = `<div class="task-grid">${tasks.map(taskCardHtml).join('')}</div>`;
      } catch {
        feed.innerHTML = errorStateHtml({
          title: 'Network error',
          message: 'Tasks could not be loaded. Please check your connection and try again.',
          actionHtml: '<a class="btn btn-outline" href="#/">RETRY</a>',
        });
      }
    },
  };
}

// ============================================================
// TASK DETAILS  (#/tasks/:id)
// ============================================================
export async function TaskDetailPage(id) {
  return {
    title: 'Task Details',
    html: `<div id="detail-root">${loadingHtml('Loading task…')}</div>`,
    async mount(root) {
      const container = root.querySelector('#detail-root');
      const task = await taskService.getTaskById(id);
      if (!task || task.status === 'archived') {
        container.innerHTML = errorStateHtml({
          icon: '🔍',
          title: 'Task not found',
          message: 'This task does not exist or is no longer available.',
          actionHtml: '<a class="btn btn-primary" href="#/">BACK TO TASKS</a>',
        });
        return;
      }
      const { thumbHtml } = await import('./ui.js');
      container.innerHTML = `
        <div class="detail-hero">${thumbHtml(task)}</div>
        <div class="card">
          <div class="detail-header">
            <div>
              <h2 class="detail-title">${escapeHtml(task.title)}</h2>
              <p class="text-muted mt-8">⏱ Estimated time: ${escapeHtml(task.est_time || task.estTime || '—')} · ${badge(task.status)}</p>
            </div>
            <div class="reward-big">🪙 ${task.reward_coins || task.reward} Coins</div>
          </div>
          <p class="mt-16">${escapeHtml(task.full_desc || task.fullDesc)}</p>
        </div>

        <div class="card mt-16">
          <h3 class="section-title" style="margin-top:0">What You Need To Do</h3>
          <div class="instruction-list">
            ${(task.what_to_do || task.whatToDo || []).map((s, i) => `
              <div class="instruction-item">
                <span class="step-num">${i + 1}</span>
                <span>${escapeHtml(s)}</span>
              </div>`).join('')}
          </div>
        </div>

        <div class="card mt-16">
          <h3 class="section-title" style="margin-top:0">What NOT To Do</h3>
          <div class="instruction-list">
            ${(task.what_not_to_do || task.whatNotToDo || []).map((s) => `
              <div class="instruction-item">
                <span class="step-num warn">✕</span>
                <span>${escapeHtml(s)}</span>
              </div>`).join('')}
          </div>
        </div>

        <div class="card mt-16">
          <h3 class="section-title" style="margin-top:0">Important Requirements</h3>
          <p>${escapeHtml(task.requirements || '—')}</p>
          <h3 class="section-title">Target Link</h3>
          <a class="btn btn-outline btn-block" href="${escapeHtml(task.target_url || task.targetUrl)}" target="_blank" rel="noopener noreferrer">🔗 Open Task Link</a>
          <div class="verify-note mt-16">
            <span aria-hidden="true">ℹ️</span>
            <span><strong>Reward: ${task.reward_coins || task.reward} Coins.</strong> Coins are <strong>not</strong> added automatically. Reward is added after administrator verification.</span>
          </div>
        </div>

        <div class="mt-16">
          <button class="btn btn-whatsapp btn-block" data-action="open-whatsapp">
            💬 OPEN WHATSAPP
          </button>
          <p class="text-muted text-center mt-8" style="font-size:.8rem">
            Complete the task, record the process, then send the video to the administrator on WhatsApp.
          </p>
        </div>
      `;
    },
  };
}

// ============================================================
// PROFILE CREATION  (#/profile/create)
// Anonymous profile — NO email / phone / OTP / password.
// Shows Recovery Code after creation (user must save it).
// ============================================================
export async function ProfileCreatePage() {
  return {
    title: 'Create Profile',
    html: `
      <div class="card form-card mt-24">
        <div class="text-center mb-16">
          <div style="font-size:2.6rem" aria-hidden="true">👋</div>
          <h2 style="font-size:1.35rem;font-weight:800">Create Your Profile</h2>
          <p class="text-muted mt-8">No email, phone number, OTP or password needed. Just your name and district.</p>
        </div>
        <form id="profile-create-form" novalidate>
          <div class="field">
            <label for="pc-name">Name</label>
            <input id="pc-name" name="name" type="text" placeholder="Enter your name" required maxlength="60" autocomplete="name">
          </div>
          <div class="field">
            <label for="pc-district">District</label>
            <select id="pc-district" name="district" required>
              <option value="" disabled selected>Select district</option>
              ${districtOptions()}
            </select>
          </div>
          <button class="btn btn-primary btn-block" type="submit">CREATE PROFILE</button>
        </form>
        
        <div class="mt-24 text-center">
          <p class="text-muted">Already have a profile?</p>
          <a href="#/profile/recover" class="btn btn-outline btn-sm mt-8">RECOVER ACCOUNT</a>
        </div>
      </div>
    `,
    mount(root) {
      const form = root.querySelector('#profile-create-form');
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        const name = String(fd.get('name') || '').trim();
        const district = String(fd.get('district') || '');
        if (name.length < 2) { showToast('Please enter your name.', 'error'); return; }
        if (!district) { showToast('Please select your district.', 'error'); return; }
        
        try {
          const result = await authService.createProfile({ name, district });
          
          // Show recovery code screen (user must save it)
          if (result.recovery_code) {
            showRecoveryCodeScreen(result.recovery_code, name);
          } else {
            showToast(`Welcome, ${name}! 🎉`, 'success');
            location.hash = '#/profile';
          }
        } catch (err) {
          showToast(err.message || 'Failed to create profile.', 'error');
        }
      });
    },
  };
}

// ============================================================
// RECOVERY CODE SCREEN — Show after profile creation
// ============================================================
function showRecoveryCodeScreen(recoveryCode, userName) {
  const root = document.getElementById('app');
  root.innerHTML = `
    <div class="app-shell">
      <header class="header">
        <div class="header-inner">
          <a href="#/" class="brand">
            <span class="brand-badge">T</span>
            <span>TaskReward</span>
          </a>
        </div>
      </header>
      <main class="page">
        <div class="card form-card mt-24">
          <div class="text-center mb-16">
            <div style="font-size:2.6rem" aria-hidden="true">🔐</div>
            <h2 style="font-size:1.35rem;font-weight:800">Save Your Recovery Code</h2>
            <p class="text-muted mt-8">Welcome, ${escapeHtml(userName)}! This is your account recovery code.</p>
          </div>
          
          <div class="card" style="background:var(--gray-soft);border:2px dashed var(--border)">
            <div class="text-center" style="padding:20px">
              <p class="text-muted" style="font-size:.85rem;margin-bottom:10px">Your Recovery Code</p>
              <div style="font-size:1.5rem;font-weight:800;letter-spacing:.1em;font-family:monospace;color:var(--primary)">${escapeHtml(recoveryCode)}</div>
            </div>
          </div>
          
          <div class="note-box mt-16">
            <strong>⚠️ Important:</strong> Save this code in a safe place. You will need it to recover your account if you change your phone or clear browser data. This code will not be shown again.
          </div>
          
          <div class="btn-row mt-16">
            <button class="btn btn-outline" onclick="navigator.clipboard.writeText('${escapeHtml(recoveryCode)}');showToast('Copied!', 'success')">📋 COPY CODE</button>
            <button class="btn btn-primary" onclick="location.hash='#/profile'">I'VE SAVED IT — CONTINUE</button>
          </div>
        </div>
      </main>
    </div>
  `;
}

// ============================================================
// RECOVER ACCOUNT PAGE  (#/profile/recover)
// ============================================================
export async function ProfileRecoverPage() {
  return {
    title: 'Recover Account',
    html: `
      <div class="card form-card mt-24">
        <div class="text-center mb-16">
          <div style="font-size:2.6rem" aria-hidden="true">🔑</div>
          <h2 style="font-size:1.35rem;font-weight:800">Recover Your Account</h2>
          <p class="text-muted mt-8">Enter your recovery code to restore your profile.</p>
        </div>
        <form id="profile-recover-form" novalidate>
          <div class="field">
            <label for="pr-code">Recovery Code</label>
            <input id="pr-code" name="code" type="text" placeholder="XXXX-XXXX-XXXX" required maxlength="14" autocomplete="off" style="font-family:monospace;letter-spacing:.1em;text-align:center;font-size:1.2rem">
            <div class="hint">Format: XXXX-XXXX-XXXX</div>
          </div>
          <button class="btn btn-primary btn-block" type="submit">RECOVER ACCOUNT</button>
        </form>
        
        <div class="mt-24 text-center">
          <p class="text-muted">Don't have a profile yet?</p>
          <a href="#/profile/create" class="btn btn-outline btn-sm mt-8">CREATE NEW PROFILE</a>
        </div>
      </div>
    `,
    mount(root) {
      const form = root.querySelector('#profile-recover-form');
      const input = root.querySelector('#pr-code');
      
      // Auto-format input (add dashes)
      input.addEventListener('input', (e) => {
        let val = e.target.value.replace(/[^A-Z0-9]/gi, '').toUpperCase();
        if (val.length > 8) val = val.slice(0, 8) + '-' + val.slice(8);
        if (val.length > 4) val = val.slice(0, 4) + '-' + val.slice(4);
        e.target.value = val;
      });
      
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const code = String(new FormData(form).get('code') || '').trim().toUpperCase();
        
        if (code.length !== 14) {
          showToast('Please enter a valid recovery code.', 'error');
          return;
        }
        
        try {
          const profile = await authService.recoverAccount(code);
          showToast(`Welcome back, ${profile.name}! 🎉`, 'success');
          location.hash = '#/profile';
        } catch (err) {
          showToast(err.message || 'Invalid recovery code.', 'error');
        }
      });
    },
  };
}

// ============================================================
// PROFILE DASHBOARD  (#/profile)
// ============================================================
export async function ProfilePage() {
  return {
    title: 'My Profile',
    html: `<div id="profile-root">${loadingHtml('Loading profile…')}</div>`,
    async mount(root) {
      const container = root.querySelector('#profile-root');
      const profile = authService.getProfile();
      if (!profile) { location.hash = '#/profile/create'; return; }

      const balance = coinService.getBalance(profile.id);
      const counts = await submissionService.getCounts(profile.id);
      const history = await submissionService.getByUser(profile.id);
      const tasks = await taskService.getAllTasks();
      const taskMap = Object.fromEntries(tasks.map((t) => [t.id, t]));

      const statusLabel = profile.status === 'blocked' ? badge('blocked', 'Blocked') : badge('active', 'Active');

      container.innerHTML = `
        <div class="card">
          <div class="profile-head">
            ${avatarHtml(profile.name)}
            <div>
              <h2 style="font-size:1.25rem;font-weight:800">Hello, ${escapeHtml(profile.name)} 👋</h2>
              <p class="text-muted">District: ${escapeHtml(profile.district)}</p>
              <p class="text-muted" style="font-size:.78rem">User ID: ${escapeHtml(profile.id)}</p>
            </div>
          </div>
          <div class="stat-grid">
            <div class="stat-box">
              <div class="stat-value" style="color:var(--amber)">🪙 ${balance}</div>
              <div class="stat-label">My Coins</div>
            </div>
            <div class="stat-box">
              <div class="stat-value">${counts.completed}</div>
              <div class="stat-label">Tasks Completed</div>
            </div>
            <div class="stat-box">
              <div class="stat-value" style="font-size:1rem;padding-top:6px">${statusLabel}</div>
              <div class="stat-label">Account Status</div>
            </div>
          </div>
          <div class="btn-row mt-16">
            <a class="btn btn-outline" href="#/profile/edit">✏️ Edit Profile</a>
            <button class="btn btn-danger-outline" data-action="user-logout">↩ Logout</button>
          </div>
        </div>

        <h3 class="section-title">Task History</h3>
        <div id="profile-history">
          ${history.length ? history.slice(0, 5).map((s) => {
            const t = taskMap[s.taskId];
            return `
            <div class="list-item">
              <div class="grow">
                <div class="title">${escapeHtml(t ? t.title : s.taskId)}</div>
                <div class="sub">${escapeHtml(s.submittedAt)} · Reward: ${t ? t.reward : '—'} Coins</div>
              </div>
              ${badge(s.status === 'pending' ? 'pending-review' : s.status, s.status === 'pending' ? 'Pending Review' : s.status)}
            </div>`;
          }).join('') : emptyStateHtml({
            icon: '🗂️',
            title: 'No task history',
            message: 'Tasks you complete will appear here after admin review.',
            actionHtml: '<a class="btn btn-primary" href="#/">BROWSE TASKS</a>',
          })}
        </div>
        ${history.length ? '<div class="text-center mt-8"><a href="#/task-history" class="btn btn-outline btn-sm">VIEW FULL HISTORY</a></div>' : ''}
        ${whatsappSupportCardHtml()}
      `;
    },
  };
}

// ============================================================
// EDIT PROFILE  (#/profile/edit)
// ============================================================
export async function ProfileEditPage() {
  const profile = authService.getProfile();
  if (!profile) {
    return { title: 'Edit Profile', html: errorStateHtml({ title: 'Profile not found', message: 'Please create a profile first.' }) };
  }
  return {
    title: 'Edit Profile',
    html: `
      <div class="card form-card mt-24">
        <h2 style="font-size:1.2rem;font-weight:800" class="mb-16">Edit Profile</h2>
        <form id="profile-edit-form" novalidate>
          <div class="field">
            <label for="pe-name">Name</label>
            <input id="pe-name" name="name" type="text" value="${escapeHtml(profile.name)}" required maxlength="60">
          </div>
          <div class="field">
            <label for="pe-district">District</label>
            <select id="pe-district" name="district" required>${districtOptions(profile.district)}</select>
          </div>
          <div class="btn-row">
            <a class="btn btn-outline" href="#/profile">CANCEL</a>
            <button class="btn btn-primary" type="submit">SAVE CHANGES</button>
          </div>
        </form>
      </div>
    `,
    mount(root) {
      const form = root.querySelector('#profile-edit-form');
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        const name = String(fd.get('name') || '').trim();
        const district = String(fd.get('district') || '');
        if (name.length < 2 || !district) { showToast('Please fill in all fields.', 'error'); return; }
        await authService.updateProfile({ name, district });
        showToast('Profile updated.', 'success');
        location.hash = '#/profile';
      });
    },
  };
}

// ============================================================
// FULL TASK HISTORY  (#/task-history)
// ============================================================
export async function TaskHistoryPage() {
  return {
    title: 'Task History',
    html: `<div id="history-root">${loadingHtml('Loading history…')}</div>`,
    async mount(root) {
      const container = root.querySelector('#history-root');
      const profile = authService.getProfile();
      if (!profile) { location.hash = '#/profile/create'; return; }
      const [history, tasks] = await Promise.all([
        submissionService.getByUser(profile.id),
        taskService.getAllTasks(),
      ]);
      const taskMap = Object.fromEntries(tasks.map((t) => [t.id, t]));
      if (!history.length) {
        container.innerHTML = emptyStateHtml({
          icon: '🗂️',
          title: 'No task history',
          message: 'Tasks you complete will appear here after admin review.',
          actionHtml: '<a class="btn btn-primary" href="#/">BROWSE TASKS</a>',
        });
        return;
      }
      container.innerHTML = history.map((s) => {
        const t = taskMap[s.taskId];
        return `
        <div class="list-item">
          <div class="grow">
            <div class="title">${escapeHtml(t ? t.title : s.taskId)}</div>
            <div class="sub">${escapeHtml(s.submittedAt)} · Reward: ${t ? t.reward : '—'} Coins</div>
          </div>
          ${badge(s.status === 'pending' ? 'pending-review' : s.status, s.status === 'pending' ? 'Pending Review' : s.status)}
        </div>`;
      }).join('');
    },
  };
}

// User self-logout (frontend state only — real session work in Phase 2)
export async function handleUserLogout() {
  const ok = await openConfirm({
    title: 'Log out?',
    message: 'Your profile is stored on this device only. You can create a new profile when you return.',
    confirmText: 'LOGOUT',
    danger: true,
  });
  if (!ok) return;
  await authService.logout();
  showToast('Logged out (demo).', 'success');
  location.hash = '#/profile/create';
}
