// ============================================================
// RECOVER ACCOUNT — Frontend Integration
// Calls the Edge Function for session recovery
// ============================================================

import { supabase } from './supabase.js';

export async function recoverAccountViaEdgeFunction(recoveryCode) {
  // Validate format: XXXX-XXXX-XXXX
  if (!recoveryCode || typeof recoveryCode !== 'string' || recoveryCode.length !== 14) {
    throw new Error('Invalid recovery code format. Expected: XXXX-XXXX-XXXX');
  }

  const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/recover-session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
    },
    body: JSON.stringify({ recovery_code: recoveryCode }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'Recovery failed');
  }

  return result;
}
