// ============================================================
// BACKEND SERVICE LAYER — Real Supabase implementations
// Replaces mock services from Phase 1
// ============================================================

import { supabase, isSupabaseConfigured } from './supabase.js';

// ============================================================
// AUTH SERVICE — Supabase Anonymous Auth
// ============================================================
export const authService = {
  // Sign in anonymously (no email/phone/OTP)
  async signInAnonymously() {
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) throw error;
    return data;
  },

  // Get current session
  async getSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    return session;
  },

  // Get current user
  async getUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  },

  // Sign out
  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  // Listen to auth changes
  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback);
  },
};

// ============================================================
// PROFILE SERVICE — User profiles with recovery
// ============================================================
export const profileService = {
  // Create profile with recovery code (calls secure function)
  async createProfile(name, district) {
    // First ensure we have an anonymous session
    const session = await authService.getSession();
    if (!session) {
      await authService.signInAnonymously();
    }

    // Call secure function to create profile + recovery code
    const { data, error } = await supabase.rpc('create_profile_with_recovery', {
      p_name: name,
      p_district: district,
    });

    if (error) throw error;
    return data;
  },

  // Get own profile
  async getProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
    return data;
  },

  // Update profile
  async updateProfile(updates) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Recover account with recovery code
  async recoverAccount(recoveryCode) {
    const { data, error } = await supabase.rpc('recover_account', {
      p_recovery_code: recoveryCode,
    });

    if (error) throw error;
    return data;
  },

  // Get user balance from ledger
  async getBalance(userId) {
    const { data, error } = await supabase.rpc('get_balance', {
      target_user_id: userId,
    });

    if (error) throw error;
    return data;
  },
};

// ============================================================
// TASK SERVICE — Task management
// ============================================================
export const taskService = {
  // Get published tasks (for users)
  async getPublishedTasks() {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('status', 'published')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Get all tasks (for admin)
  async getAllTasks() {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Get single task
  async getTaskById(id) {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  // Create task (admin only)
  async createTask(taskData) {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        ...taskData,
        created_by: user?.id,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update task (admin only)
  async updateTask(id, updates) {
    const { data, error } = await supabase
      .from('tasks')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Archive task (admin only)
  async archiveTask(id) {
    const { data, error } = await supabase
      .from('tasks')
      .update({ status: 'archived', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Submit task completion (user)
  async submitTask(taskId) {
    const { data, error } = await supabase.rpc('create_task_submission', {
      p_task_id: taskId,
    });

    if (error) throw error;
    return data;
  },
};

// ============================================================
// USER SERVICE — Admin user management
// ============================================================
export const userService = {
  // Get all users (admin only)
  async getUsers() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Search users
  async searchUsers(query) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .or(`name.ilike.%${query}%,id.ilike.%${query}%,district.ilike.%${query}%`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Get user by ID
  async getUserById(id) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  // Update user (admin only)
  async updateUser(id, updates) {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Block user (admin only)
  async blockUser(userId, reason = 'Blocked by admin') {
    const { data, error } = await supabase.rpc('admin_block_user', {
      p_target_user_id: userId,
      p_reason: reason,
    });

    if (error) throw error;
    return data;
  },

  // Unblock user (admin only)
  async unblockUser(userId) {
    const { data, error } = await supabase.rpc('admin_unblock_user', {
      p_target_user_id: userId,
    });

    if (error) throw error;
    return data;
  },
};

// ============================================================
// COIN SERVICE — Coin management
// ============================================================
export const coinService = {
  // Get user's coin history
  async getHistory(userId) {
    const { data, error } = await supabase
      .from('coin_ledger')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Get all transactions (admin)
  async getAllTransactions() {
    const { data, error } = await supabase
      .from('coin_ledger')
      .select('*, profiles(name)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Get balance
  async getBalance(userId) {
    const { data, error } = await supabase.rpc('get_balance', {
      target_user_id: userId,
    });

    if (error) throw error;
    return data;
  },

  // Admin: Add coins
  async adminAddCoins(userId, amount, reason, idempotencyKey) {
    const { data, error } = await supabase.rpc('admin_add_coins', {
      p_target_user_id: userId,
      p_amount: amount,
      p_reason: reason,
      p_idempotency_key: idempotencyKey,
    });

    if (error) throw error;
    return data;
  },

  // Admin: Settle coins (payout)
  async adminSettleCoins(userId, amount, reason, idempotencyKey) {
    const { data, error } = await supabase.rpc('admin_settle_coins', {
      p_target_user_id: userId,
      p_amount: amount,
      p_reason: reason,
      p_idempotency_key: idempotencyKey,
    });

    if (error) throw error;
    return data;
  },
};

// ============================================================
// SUBMISSION SERVICE — Task submissions
// ============================================================
export const submissionService = {
  // Get user's submissions
  async getByUser(userId) {
    const { data, error } = await supabase
      .from('task_submissions')
      .select('*, tasks(title, reward_coins)')
      .eq('user_id', userId)
      .order('submitted_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Get pending submissions (admin)
  async getPending() {
    const { data, error } = await supabase
      .from('task_submissions')
      .select('*, profiles(name, district), tasks(title, reward_coins)')
      .eq('status', 'pending')
      .order('submitted_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Review submission (admin)
  async review(submissionId, status, rejectionReason = null) {
    const { data, error } = await supabase.rpc('admin_review_submission', {
      p_submission_id: submissionId,
      p_status: status,
      p_rejection_reason: rejectionReason,
    });

    if (error) throw error;
    return data;
  },

  // Get counts
  async getCounts(userId) {
    const { data, error } = await supabase
      .from('task_submissions')
      .select('status')
      .eq('user_id', userId);

    if (error) throw error;

    return {
      completed: data.filter(s => s.status === 'approved').length,
      pending: data.filter(s => s.status === 'pending').length,
      rejected: data.filter(s => s.status === 'rejected').length,
    };
  },
};

// ============================================================
// SETTINGS SERVICE — App configuration
// ============================================================
export const settingsService = {
  async getAll() {
    const { data, error } = await supabase
      .from('app_settings')
      .select('*');

    if (error) throw error;
    
    return data.reduce((acc, { key, value }) => {
      acc[key] = value;
      return acc;
    }, {});
  },

  async update(key, value) {
    const { data, error } = await supabase
      .from('app_settings')
      .upsert({ key, value, updated_at: new Date().toISOString() })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Save multiple settings at once
  async save(updates) {
    const results = [];
    for (const [key, value] of Object.entries(updates)) {
      const result = await this.update(key, String(value));
      results.push(result);
    }
    return results;
  },
};

// ============================================================
// STORAGE SERVICE — Task image uploads
// ============================================================
export const storageService = {
  async uploadTaskImage(file, taskId) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${taskId}/${Date.now()}.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from('task-images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) throw error;
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('task-images')
      .getPublicUrl(fileName);

    return publicUrl;
  },

  async deleteTaskImage(path) {
    const { error } = await supabase.storage
      .from('task-images')
      .remove([path]);

    if (error) throw error;
  },
};

// ============================================================
// ADMIN SERVICE — Admin authentication + management
// ============================================================
export const adminService = {
  // Check if current user is admin
  async isAdmin() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase
      .from('admin_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    return !error && data && ['super_admin', 'admin'].includes(data.role);
  },

  // Get admin role
  async getRole() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('admin_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (error) return null;
    return data?.role;
  },

  // Login — real Supabase auth (email/password or magic link)
  // For V1: admin uses Supabase dashboard to create first admin user
  // Then logs in with that account. No 10-digit password in frontend.
  async login() {
    // Real implementation: check if user is already authenticated + has admin role
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Please sign in with your admin account first');
    }
    
    const isAdmin = await this.isAdmin();
    if (!isAdmin) {
      throw new Error('This account does not have admin privileges');
    }
    
    return true;
  },

  // Logout
  async logout() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },
};
