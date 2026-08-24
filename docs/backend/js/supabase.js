// ============================================================
// SUPABASE CLIENT CONFIGURATION
// Phase 2: Real backend connection
// Uses environment variables with fallback to placeholder
// ============================================================

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// ============================================================
// CONFIGURATION — Set via environment variables or edit directly
// For local dev: create a .env file or edit values below
// For production: use your hosting platform's env vars
// ============================================================

// Try to read from environment (Node.js/build tools) or use placeholder
const getEnv = (key, fallback = '') => {
  // Browser: check for injected env vars (e.g., via window.__ENV__)
  if (typeof window !== 'undefined' && window.__ENV__ && window.__ENV__[key]) {
    return window.__ENV__[key];
  }
  // Node.js: check process.env
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  return fallback;
};

const SUPABASE_URL = getEnv('SUPABASE_URL', 'https://vdiikrxljouwymrleook.supabase.co');
const SUPABASE_ANON_KEY = getEnv('SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkaWlrcnhsam91d3ltcmxlb29rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1NjAzODgsImV4cCI6MjEwMzEzNjM4OH0.RgHDeZ5qJP76Bglt1I9kGFr_8JgSvLoBoNtVuHOuCXM');

// Validate configuration
if (SUPABASE_URL === 'YOUR_SUPABASE_URL' || SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY') {
  console.warn('⚠️ Supabase not configured. Using mock mode. Set SUPABASE_URL and SUPABASE_ANON_KEY environment variables.');
}

// Create Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// ============================================================
// Helper: Check if Supabase is properly configured
// ============================================================
export function isSupabaseConfigured() {
  return SUPABASE_URL !== 'YOUR_SUPABASE_URL' && 
         SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY' &&
         SUPABASE_URL.includes('supabase.co');
}

// ============================================================
// Helper: Get current session
// ============================================================
export async function getSession() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) {
    console.error('Session error:', error);
    return null;
  }
  return session;
}

// ============================================================
// Helper: Get current user
// ============================================================
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) {
    console.error('User error:', error);
    return null;
  }
  return user;
}

// ============================================================
// Helper: Check if user is admin
// ============================================================
export async function isAdmin() {
  const user = await getCurrentUser();
  if (!user) return false;
  
  const { data, error } = await supabase
    .from('admin_roles')
    .select('role')
    .eq('user_id', user.id)
    .single();
  
  return !error && data && ['super_admin', 'admin'].includes(data.role);
}
