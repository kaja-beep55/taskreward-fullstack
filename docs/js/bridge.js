// ============================================================
// FRONTEND-BACKEND BRIDGE
// This file decides whether to use mock or real Supabase backend
// ============================================================

import { isSupabaseConfigured } from '../backend/js/supabase.js';
import * as mockServices from './services.js';
import * as realServices from '../backend/js/services.js';

// Determine which backend to use
const useRealBackend = isSupabaseConfigured();

if (useRealBackend) {
  console.log('🚀 Using Supabase backend');
} else {
  console.log('🎭 Using mock backend (configure backend/js/supabase.js to switch)');
}

// Mock fallback for settings (real backend settingsService returns DB rows without defaults)
const mockSettings = {
  getAll() {
    return {
      whatsappNumber: '10000000000',
      appName: 'TaskReward',
      defaultTaskStatus: 'draft',
    };
  },
  save() {},
};

// Real backend authService with getProfile fallback
const realAuthService = {
  ...realServices.authService,
  getProfile() {
    // Real backend doesn't have getProfile — return null (router will handle)
    return null;
  },
};

// Real backend adminService with isAuthed fallback
const realAdminService = {
  ...realServices.adminService,
  isAuthed() {
    // Real backend checks Supabase session, not localStorage
    return false; // Router will redirect to admin/login
  },
};

// Real backend settingsService with defaults fallback
const realSettingsWithDefaults = {
  async getAll() {
    const dbSettings = await realServices.settingsService.getAll();
    return {
      whatsappNumber: dbSettings.whatsapp_number || dbSettings.whatsappNumber || '10000000000',
      appName: dbSettings.app_name || dbSettings.appName || 'TaskReward',
      defaultTaskStatus: dbSettings.default_task_status || dbSettings.defaultTaskStatus || 'draft',
    };
  },
  async save(updates) {
    const mapped = {};
    if (updates.whatsappNumber !== undefined) mapped.whatsapp_number = updates.whatsappNumber;
    if (updates.appName !== undefined) mapped.app_name = updates.appName;
    if (updates.defaultTaskStatus !== undefined) mapped.default_task_status = updates.defaultTaskStatus;
    return realServices.settingsService.save(mapped);
  },
};

// Export the appropriate services
export const authService = useRealBackend ? realAuthService : mockServices.authService;
export const taskService = useRealBackend ? realServices.taskService : mockServices.taskService;
export const userService = useRealBackend ? realServices.userService : mockServices.userService;
export const coinService = useRealBackend ? realServices.coinService : mockServices.coinService;
export const submissionService = useRealBackend ? realServices.submissionService : mockServices.submissionService;
export const adminService = useRealBackend ? realAdminService : mockServices.adminService;
export const settingsService = useRealBackend ? realSettingsWithDefaults : mockServices.settingsService;
export const storageService = useRealBackend ? realServices.storageService : mockServices.storageService;
export { mockSettings };
