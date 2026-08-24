// ============================================================
// APPLICATION ROUTER + BOOT
// Hash-based SPA router with UI-level route guards.
// Phase 3: guards become real auth/session checks server-side.
// ============================================================
import { CONFIG, settingsService } from './config.js';
import { authService, adminService } from './bridge.js';
import { openWhatsApp, errorStateHtml, escapeHtml } from './ui.js';
import {
  HomePage, TaskDetailPage, ProfileCreatePage, ProfileRecoverPage, ProfilePage,
  ProfileEditPage, TaskHistoryPage, handleUserLogout,
} from './pages-user.js';
import {
  AdminLoginPage, AdminDashboardPage, AdminTasksPage, AdminTaskFormPage,
  AdminUsersPage, AdminUserDetailPage, AdminCoinsPage, AdminCoinHistoryPage,
  AdminSettingsPage, handleArchiveTask, handleReview, handleBlockUser,
  handleUnblockUser, handleLogoutUser, handleAdminLogout,
} from './pages-admin.js';
import { PrivacyPage, TermsPage, TaskRulesPage, ContactPage } from './pages-policy.js';

const app = document.getElementById('app');

// ---------------- Route table ----------------
const routes = [
  { pattern: /^\/$/,                        kind: 'user',   page: () => HomePage() },
  { pattern: /^\/tasks$/,                   kind: 'user',   page: () => HomePage() },
  { pattern: /^\/tasks\/([\w-]+)$/,         kind: 'user',   page: (p) => TaskDetailPage(p[1]) },
  { pattern: /^\/profile\/create$/,         kind: 'user',   page: () => ProfileCreatePage() },
  { pattern: /^\/profile\/recover$/,        kind: 'user',   page: () => ProfileRecoverPage() },
  { pattern: /^\/profile\/edit$/,           kind: 'user',   page: () => ProfileEditPage() },
  { pattern: /^\/profile$/,                 kind: 'user',   page: () => ProfilePage() },
  { pattern: /^\/task-history$/,            kind: 'user',   page: () => TaskHistoryPage() },

  { pattern: /^\/admin\/login$/,            kind: 'admin',  page: () => AdminLoginPage(), public: true },
  { pattern: /^\/admin$/,                   kind: 'admin',  page: () => AdminDashboardPage() },
  { pattern: /^\/admin\/tasks$/,            kind: 'admin',  page: () => AdminTasksPage() },
  { pattern: /^\/admin\/tasks\/new$/,       kind: 'admin',  page: () => AdminTaskFormPage(null) },
  { pattern: /^\/admin\/tasks\/([\w-]+)\/edit$/, kind: 'admin', page: (p) => AdminTaskFormPage(p[1]) },
  { pattern: /^\/admin\/users$/,            kind: 'admin',  page: () => AdminUsersPage() },
  { pattern: /^\/admin\/users\/([\w-]+)$/,  kind: 'admin',  page: (p) => AdminUserDetailPage(p[1]) },
  { pattern: /^\/admin\/coins$/,            kind: 'admin',  page: () => AdminCoinsPage() },
  { pattern: /^\/admin\/coin-history$/,     kind: 'admin',  page: () => AdminCoinHistoryPage() },
  { pattern: /^\/admin\/settings$/,         kind: 'admin',  page: () => AdminSettingsPage() },

  { pattern: /^\/privacy$/,                 kind: 'policy', page: () => PrivacyPage() },
  { pattern: /^\/terms$/,                   kind: 'policy', page: () => TermsPage() },
  { pattern: /^\/task-rules$/,              kind: 'policy', page: () => TaskRulesPage() },
  { pattern: /^\/contact$/,                 kind: 'policy', page: () => ContactPage() },
];

// ---------------- User-area chrome ----------------
function userHeader() {
  const profile = authService.getProfile();
  const appName = settingsService.getAll().appName;
  return `
    <header class="header">
      <div class="header-inner">
        <a href="#/" class="brand">
          <span class="brand-badge">T</span>
          <span>${escapeHtml(appName)}</span>
        </a>
        <div class="header-actions">
          <a class="icon-btn" href="${profile ? '#/profile' : '#/profile/create'}" aria-label="User profile">👤 <span>Profile</span></a>
          <a class="icon-btn admin-entry" href="#/admin/login" aria-label="Admin panel">🛡️ <span>Admin</span></a>
        </div>
      </div>
    </header>`;
}

function userFooter() {
  const appName = settingsService.getAll().appName;
  return `
    <footer class="footer">
      <div class="footer-inner">
        <div class="footer-links">
          <a href="#/privacy">Privacy Policy</a>
          <a href="#/terms">Terms of Service</a>
          <a href="#/task-rules">Task &amp; Reward Rules</a>
          <a href="#/contact">Contact / Support</a>
        </div>
        <p>© 2026 ${escapeHtml(appName)} · Demo frontend build</p>
      </div>
    </footer>`;
}

function userBottomNav(active) {
  const item = (href, icon, label) =>
    `<a href="${href}" class="${active === href.slice(1) ? 'active' : ''}">
      <span class="nav-icon" aria-hidden="true">${icon}</span>${label}</a>`;
  return `
    <nav class="bottom-nav" aria-label="Main navigation">
      ${item('#/', '📋', 'Tasks')}
      ${item('#/profile', '👤', 'Profile')}
      ${item('#/admin/login', '🛡️', 'Admin')}
    </nav>`;
}

function userShell(mainHtml, active) {
  return `
    <div class="app-shell">
      ${userHeader()}
      <main class="page">${mainHtml}</main>
      ${userFooter()}
      ${userBottomNav(active)}
    </div>`;
}

// ---------------- Admin-area chrome ----------------
const ADMIN_NAV = [
  ['#/admin', '📊 Dashboard'],
  ['#/admin/tasks', '📋 Tasks'],
  ['#/admin/tasks/new', '＋ Add Task'],
  ['#/admin/users', '👥 Users'],
  ['#/admin/coins', '🪙 Coin Management'],
  ['#/admin/coin-history', '🧾 Coin History'],
  ['#/admin/settings', '⚙️ Settings'],
];

function adminShell(mainHtml, active) {
  const navLinks = ADMIN_NAV.map(([href, label]) =>
    `<a href="${href}" class="${active === href.slice(1) ? 'active' : ''}">${label}</a>`
  ).join('');
  return `
    <div class="admin-shell">
      <div class="admin-bar">
        <div class="admin-bar-inner">
          <a href="#/admin" class="brand"><span class="brand-badge">🛡️</span><span>Admin Panel</span></a>
          <div class="header-actions">
            <button class="hamburger" data-action="open-drawer" aria-label="Open admin menu">☰</button>
            <button class="btn btn-sm" data-action="admin-logout" style="background:rgba(255,255,255,.12);color:#fff;border:none">Exit</button>
          </div>
        </div>
        <nav class="admin-tabs" aria-label="Admin navigation">${navLinks}</nav>
      </div>
      <main class="page" style="flex:1">${mainHtml}</main>
      <div class="admin-drawer" id="admin-drawer">
        <div class="drawer-backdrop" data-action="close-drawer"></div>
        <div class="drawer-panel">
          <h3>Admin Menu</h3>
          ${ADMIN_NAV.map(([href, label]) => `<a class="drawer-link" href="${href}">${label}</a>`).join('')}
          <h3>Account</h3>
          <a class="drawer-link" href="#/" style="color:var(--muted)">🏠 Back to user site</a>
          <button class="drawer-link" data-action="admin-logout" style="width:100%;text-align:left;border:none;background:none">🚪 Exit Admin</button>
        </div>
      </div>
    </div>`;
}

// ---------------- Router ----------------
async function render() {
  const hash = location.hash.slice(1) || '/';

  for (const route of routes) {
    const match = hash.match(route.pattern);
    if (!match) continue;

    // ---- UI-level guards (demo only) ----
    if (route.kind === 'admin' && !route.public && !adminService.isAuthed()) {
      location.hash = '#/admin/login';
      return;
    }
    // First-visit flow: users without a profile go to profile creation.
    if (route.kind === 'user' && !authService.getProfile() &&
        !hash.startsWith('/profile/create') && !hash.startsWith('/tasks') && hash !== '/') {
      location.hash = '#/profile/create';
      return;
    }
    // Returning users land on their profile.
    if (route.kind === 'user' && authService.getProfile() && hash === '/profile/create') {
      location.hash = '#/profile';
      return;
    }

    const page = await route.page(match);
    document.title = `${page.title || 'Home'} — ${settingsService.getAll().appName}`;

    if (route.kind === 'admin') {
      app.innerHTML = adminShell(page.html, hash);
    } else {
      app.innerHTML = userShell(page.html, hash);
    }

    if (page.mount) await page.mount(app);
    window.scrollTo({ top: 0 });
    return;
  }

  // ---- 404 ----
  app.innerHTML = userShell(errorStateHtml({
    icon: '🚧',
    title: 'Page not found',
    message: 'The page you are looking for does not exist.',
    actionHtml: '<a class="btn btn-primary" href="#/">GO HOME</a>',
  }), hash);
}

// ---------------- Global action delegation ----------------
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const action = el.dataset.action;
  const { id, name, title } = el.dataset;

  switch (action) {
    case 'open-whatsapp': openWhatsApp(); break;
    case 'user-logout': handleUserLogout(); break;
    case 'admin-logout': handleAdminLogout(); break;
    case 'archive-task': handleArchiveTask(id, title); break;
    case 'approve-submission': handleReview(id, 'approved'); break;
    case 'reject-submission': handleReview(id, 'rejected'); break;
    case 'block-user': handleBlockUser(id, name); break;
    case 'unblock-user': handleUnblockUser(id, name); break;
    case 'logout-user': handleLogoutUser(id, name); break;
    case 'open-drawer': document.getElementById('admin-drawer')?.classList.add('open'); break;
    case 'close-drawer': document.getElementById('admin-drawer')?.classList.remove('open'); break;
  }
});

// Close drawer when navigating + re-render
window.addEventListener('hashchange', () => {
  document.getElementById('admin-drawer')?.classList.remove('open');
  render();
});

document.title = CONFIG.APP_NAME;
render();
