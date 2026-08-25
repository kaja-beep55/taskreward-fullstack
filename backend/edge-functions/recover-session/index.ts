// ============================================================
// RECOVER SESSION EDGE FUNCTION
// Verifies recovery code and creates a session for new device
// POST /functions/v1/recover-session
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// CORS headers for browser access
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { recovery_code } = await req.json();

    if (!recovery_code || typeof recovery_code !== 'string') {
      throw new Error('Recovery code required');
    }

    // Initialize Supabase client with service role (for admin operations)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify recovery code using secure function
    const { data: profile, error: verifyError } = await supabaseAdmin
      .rpc('recover_account_session', { p_recovery_code: recovery_code });

    if (verifyError || !profile) {
      return new Response(
        JSON.stringify({ error: 'Invalid recovery code' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user by ID
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(profile.id);
    
    if (userError || !userData.user) {
      // Create new anonymous session for recovered user
      const { data: newSession, error: sessionError } = await supabaseAdmin.auth.signInAnonymously();
      
      if (sessionError) {
        throw sessionError;
      }

      // Link the anonymous session to recovered profile
      const { error: linkError } = await supabaseAdmin
        .from('profiles')
        .update({ id: newSession.user.id })
        .eq('id', profile.id);

      return new Response(
        JSON.stringify({
          success: true,
          profile: profile,
          session: {
            access_token: newSession.session.access_token,
            refresh_token: newSession.session.refresh_token,
          },
          message: 'Account recovered successfully'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // User exists — return success (frontend will use existing anonymous session)
    return new Response(
      JSON.stringify({
        success: true,
        profile: profile,
        message: 'Account recovered successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
