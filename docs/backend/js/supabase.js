// ============================================================
// SUPABASE CLIENT CONFIGURATION (resilient loader)
// Falls back to mock mode if CDN/keys unavailable — never blanks the UI
// ============================================================

const getEnv = (key, fallback = '') => {
  if (typeof window !== 'undefined' && window.__ENV__ && window.__ENV__[key]) {
    return window.__ENV__[key];
  }
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  return fallback;
};

const SUPABASE_URL = getEnv('SUPABASE_URL', 'https://vdiikrxljouwymrleook.supabase.co');
const SUPABASE_ANON_KEY = getEnv('SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkaWlrcnhsam91d3ltcmxlb29rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1NjAzODgsImV4cCI6MjEwMzEzNjM4OH0.RgHDeZ5qJP76Bglt1I9kGFr_8JgSvLoBoNtVuHOuCXM');
const CDN_URL = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
const CDN_TIMEOUT_MS = 8000;

export function isSupabaseConfigured() {
  return SUPABASE_URL && SUPABASE_ANON_KEY &&
         SUPABASE_URL !== 'YOUR_SUPABASE_URL' &&
         SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY' &&
         SUPABASE_URL.includes('supabase.co');
}

let client = null;
try {
  if (isSupabaseConfigured()) {
    const mod = await Promise.race([
      import(CDN_URL),
      new Promise((resolve, reject) => setTimeout(() => reject(new Error('CDN timeout')), CDN_TIMEOUT_MS)),
    ]);
    client = mod.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true },
    });
  }
} catch (err) {
  console.warn('Supabase unavailable — mock mode.', err && err.message);
}

export const supabase = client;

export async function getSession() {
  if (!supabase) return null;
  try {
    const res = await supabase.auth.getSession();
    if (res.error) { console.error('Session error:', res.error); return null; }
    return res.data.session;
  } catch (e) { console.error('Session exception:', e); return null; }
}

export async function getCurrentUser() {
  if (!supabase) return null;
  try {
    const res = await supabase.auth.getUser();
    if (res.error) { console.error('User error:', res.error); return null; }
    return res.data.user;
  } catch (e) { console.error('User exception:', e); return null; }
}
