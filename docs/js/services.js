// ============================================================
// SERVICE LAYER — mock implementations for the prototype.
// Every method mirrors a future Supabase call so Phase 2 can
// swap implementations WITHOUT touching the UI.
// TODO Phase 2: replace internals with supabase-js calls.
// ============================================================

import { MOCK_TASKS, MOCK_USERS, MOCK_TRANSACTIONS, MOCK_SUBMISSIONS } from './data.js';

// ---------- local persistence helpers (demo only) ----------
const LS = {
  read(key, fallback) {
    try {
      const v = JSON.parse(localStorage.getItem(key));
      return v === null || v === undefined ? fallback : v;
    } catch { return fallback; }
  },
  write(key, value) { localStorage.setItem(key, JSON.stringify(value)); },
  remove(key) { localStorage.removeItem(key); },
};

function seed(key, seedValue) {
  let v = LS.read(key, null);
  if (!v) { v = seedValue; LS.write(key, v); }
  return v;
}

function uid(prefix) {
  return `${prefix}-${Math.random().toString(16).slice(2, 8).toUpperCase()}`;
}

function simulateLatency(ms = 250) {
  return new Promise((res) => setTimeout(res, ms));
}

// ============================================================
// authService — anonymous profile-based session (MOCK)
// TODO Phase 2: supabase.auth.signInAnonymously() + profiles table
// ============================================================
export const authService = {
  PROFILE_KEY: 'trp_profile',

  // TODO Phase 2: supabase.auth.getSession()
  getProfile() {
    return LS.read(this.PROFILE_KEY, null);
  },

  // TODO Phase 2: signInAnonymously() then INSERT INTO profiles
  async createProfile({ name, district }) {
    await simulateLatency();
    const profile = {
      id: uid('USR'),
      name: name.trim(),
      district,
      status: 'active',
      createdAt: new Date().toISOString().slice(0, 10),
      isAnonymous: true, // mirrors Supabase is_anonymous claim
    };
    LS.write(this.PROFILE_KEY, profile);
    // Mock recovery code for demo flow
    const mockRecovery = 'MOCK-' + Math.random().toString(36).slice(2, 6).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
    return { ...profile, recovery_code: mockRecovery };
  },

  // TODO Phase 2: UPDATE profiles SET ... WHERE id = auth.uid()
  async updateProfile(updates) {
    await simulateLatency(150);
    const profile = { ...this.getProfile(), ...updates };
    LS.write(this.PROFILE_KEY, profile);
    return profile;
  },

  // TODO Phase 2: supabase.auth.signOut()
  // NOTE: frontend-only state clear. Real session invalidation
  // happens server-side in Phase 2/3.
  async logout() {
    await simulateLatency(150);
    LS.remove(this.PROFILE_KEY);
  },

  // TODO Phase 2: real recovery via secure function
  async recoverAccount(code) {
    await simulateLatency(300);
    const profile = this.getProfile();
    if (!profile) throw new Error('No profile found on this device. Create a new profile first.');
    return profile;
  },

  // Check if current user is admin (mock: always false)
  async isAdmin() {
    return false;
  },
};

// ============================================================
// taskService — task CRUD (MOCK)
// TODO Phase 2: supabase.from('tasks')...
// ============================================================
export const taskService = {
  KEY: 'trp_tasks',

  _all() { return seed(this.KEY, MOCK_TASKS); },
  _save(tasks) { LS.write(this.KEY, tasks); },

  // TODO Phase 2: .select('*').eq('status','published')
  async getPublishedTasks() {
    await simulateLatency(300);
    return this._all().filter((t) => t.status === 'published');
  },

  // TODO Phase 2: .select('*') (admin sees everything)
  async getAllTasks() {
    await simulateLatency(300);
    return this._all();
  },

  // TODO Phase 2: .select('*').eq('id', id).single()
  async getTaskById(id) {
    await simulateLatency(150);
    return this._all().find((t) => t.id === id) || null;
  },

  // TODO Phase 2: .insert({...})  — admin only, enforced by RLS
  async createTask(data, status) {
    await simulateLatency();
    const tasks = this._all();
    const task = {
      id: uid('task'),
      theme: data.theme || 'default',
      imageData: data.imageData || null,
      createdAt: new Date().toISOString().slice(0, 10),
      ...data,
      reward: Number(data.reward) || 0,
      status,
    };
    tasks.unshift(task);
    this._save(tasks);
    return task;
  },

  // TODO Phase 2: .update({...}).eq('id', id) — admin only
  async updateTask(id, updates) {
    await simulateLatency();
    const tasks = this._all().map((t) =>
      t.id === id ? { ...t, ...updates, reward: Number(updates.reward ?? t.reward) } : t
    );
    this._save(tasks);
    return tasks.find((t) => t.id === id);
  },

  // Soft-delete only. Phase 2: .update({ status: 'archived' })
  async archiveTask(id) {
    await simulateLatency();
    const tasks = this._all().map((t) => (t.id === id ? { ...t, status: 'archived' } : t));
    this._save(tasks);
  },
};

// ============================================================
// userService — user management (MOCK)
// TODO Phase 2: supabase.from('profiles')...
// ============================================================
export const userService = {
  KEY: 'trp_users',

  _all() { return seed(this.KEY, MOCK_USERS); },
  _save(users) { LS.write(this.KEY, users); },

  async getUsers() {
    await simulateLatency(300);
    return this._all();
  },

  async getUserById(id) {
    await simulateLatency(150);
    return this._all().find((u) => u.id === id) || null;
  },

  async searchUsers(query) {
    await simulateLatency(200);
    const q = query.trim().toLowerCase();
    if (!q) return this._all();
    return this._all().filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.id.toLowerCase().includes(q) ||
        u.district.toLowerCase().includes(q)
    );
  },

  // TODO Phase 2: .update({...}).eq('id', id) — admin only
  async updateUser(id, updates) {
    await simulateLatency();
    const users = this._all().map((u) => (u.id === id ? { ...u, ...updates } : u));
    this._save(users);
    return users.find((u) => u.id === id);
  },

  // TODO Phase 3: real blocking via backend (revoke sessions,
  // set profiles.status='blocked' with RLS + admin role check)
  async setUserStatus(id, status) {
    return this.updateUser(id, { status });
  },
};

// ============================================================
// coinService — append-only ledger (MOCK)
// Balances are DERIVED from the ledger. The UI never mutates
// balances directly. Phase 5: secure RPC / Edge Function writes.
// ============================================================
export const coinService = {
  KEY: 'trp_transactions',

  _all() { return seed(this.KEY, MOCK_TRANSACTIONS); },
  _save(tx) { LS.write(this.KEY, tx); },

  // TODO Phase 5: SELECT * FROM coin_ledger WHERE user_id = $1
  async getHistory(userId) {
    await simulateLatency(150);
    return this._all()
      .filter((t) => t.userId === userId)
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  },

  async getAllTransactions() {
    await simulateLatency(250);
    return this._all().slice().sort((a, b) => (a.date < b.date ? 1 : -1));
  },

  // Balance = SUM(delta). Never stored separately.
  getBalance(userId) {
    return this._all()
      .filter((t) => t.userId === userId)
      .reduce((sum, t) => sum + t.delta, 0);
  },

  getTotalIssued() {
    return this._all().filter((t) => t.delta > 0).reduce((s, t) => s + t.delta, 0);
  },

  // TODO Phase 5: supabase.rpc('admin_add_coins', {...}) executed
  // by a SECURITY DEFINER function with idempotency key + RLS.
  // NEVER allow the normal user client to call this.
  async adminAddCoins(adminName, targetUserId, amount, reason) {
    await simulateLatency();
    const tx = {
      id: uid('tx'),
      userId: targetUserId,
      delta: Number(amount),
      type: Number(amount) >= 0 ? 'reward' : 'adjustment',
      reason,
      admin: adminName,
      status: 'completed',
      date: new Date().toISOString().slice(0, 10),
    };
    const all = this._all();
    all.push(tx);
    this._save(all);
    return tx;
  },
};

// ============================================================
// submissionService — task submissions / reviews (MOCK)
// TODO Phase 4: supabase.from('task_submissions')...
// ============================================================
export const submissionService = {
  KEY: 'trp_submissions',

  _all() { return seed(this.KEY, MOCK_SUBMISSIONS); },
  _save(s) { LS.write(this.KEY, s); },

  async getByUser(userId) {
    await simulateLatency(150);
    return this._all().filter((s) => s.userId === userId);
  },

  async getPending() {
    await simulateLatency(250);
    return this._all().filter((s) => s.status === 'pending');
  },

  async getCounts(userId) {
    const subs = this._all().filter((s) => s.userId === userId);
    return {
      completed: subs.filter((s) => s.status === 'approved').length,
      pending: subs.filter((s) => s.status === 'pending').length,
      rejected: subs.filter((s) => s.status === 'rejected').length,
    };
  },

  // Mock review action. Phase 4: admin-only RPC with audit log.
  async setStatus(id, status) {
    await simulateLatency();
    const subs = this._all().map((s) => (s.id === id ? { ...s, status } : s));
    this._save(subs);
  },
};

// ============================================================
// adminService — admin session (MOCK, NO real security)
// WARNING: this is a UI placeholder only. Phase 3 replaces it
// with secure server-side authentication + admin_roles + RLS.
// The password is NEVER stored or checked in frontend code.
// ============================================================
export const adminService = {
  KEY: 'trp_admin_session',

  isAuthed() {
    return LS.read(this.KEY, false) === true;
  },

  // Check if current user is admin (mock: checks localStorage flag)
  async isAdmin() {
    return this.isAuthed();
  },

  // Accepts any 10-character credential purely to demo the UI
  // flow. TODO Phase 3: POST to a secure backend endpoint that
  // verifies a hashed credential and issues a server session.
  async login(password) {
    await simulateLatency(400);
    if (typeof password !== 'string' || password.length !== 10) {
      throw new Error('Password must be exactly 10 characters.');
    }
    LS.write(this.KEY, true);
    return true;
  },

  async logout() {
    await simulateLatency(150);
    LS.remove(this.KEY);
  },
};

// ============================================================
// storageService — local image preview only (MOCK)
// TODO Phase 2: supabase.storage.from('task-images').upload(...)
// ============================================================
export const storageService = {
  // Reads a File and returns a data URL for preview.
  // Nothing is uploaded anywhere in this phase.
  readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      if (!file || !file.type.startsWith('image/')) {
        reject(new Error('Please choose a valid image file.'));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Could not read the file.'));
      reader.readAsDataURL(file);
    });
  },
};
