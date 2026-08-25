// ============================================================
// RECOVERY CODE UI — Separate module for account recovery
// Kept separate so it can be reused or removed independently
// ============================================================

import { escapeHtml, showToast } from './ui.js';
import { authService } from './bridge.js';

// ============================================================
// Show Recovery Code after profile creation
// ============================================================
export function showRecoveryCodeScreen(recoveryCode, userName) {
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
// RECOVER ACCOUNT PAGE
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
          // Use Edge Function if available, fallback to RPC
          let profile;
          try {
            const edgeResult = await fetch(`${window.__ENV__?.SUPABASE_URL || ''}/functions/v1/recover-session`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${window.__ENV__?.SUPABASE_ANON_KEY || ''}`,
              },
              body: JSON.stringify({ recovery_code: code }),
            });
            if (edgeResult.ok) {
              profile = await edgeResult.json();
            } else {
              throw new Error('Edge function unavailable');
            }
          } catch {
            // Fallback to RPC if Edge Function not deployed
            profile = await authService.recoverAccount(code);
          }
          
          showToast(`Welcome back, ${profile.name || profile.profile?.name}! 🎉`, 'success');
          location.hash = '#/profile';
        } catch (err) {
          showToast(err.message || 'Invalid recovery code.', 'error');
        }
      });
    },
  };
}
