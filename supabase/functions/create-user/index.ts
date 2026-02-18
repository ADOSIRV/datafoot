import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const body = await req.json();
    const { email, password, first_name, last_name, role, club_id, team_id, district_id, phone, position, date_of_birth, jersey_number } = body;

    // 1. Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: password ?? Math.random().toString(36).slice(-10),
      email_confirm: true,
    });

    if (authError) throw authError;

    // 2. Create profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        user_id: authData.user.id,
        email,
        first_name,
        last_name,
        role,
        club_id:      club_id      || null,
        team_id:      team_id      || null,
        district_id:  district_id  || null,
        phone:        phone        || null,
        position:     position     || 'unknown',
        date_of_birth: date_of_birth || null,
        jersey_number: jersey_number || null,
        is_active: true,
      })
      .select('*, club:clubs(*), team:teams(*)')
      .single();

    if (profileError) {
      // rollback auth user
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      throw profileError;
    }

    return new Response(JSON.stringify(profile), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 201,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
