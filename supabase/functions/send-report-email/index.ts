import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Sends a performance report PDF to a player.
 * Body: { to, playerName, pdfBase64, month }
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { to, playerName, pdfBase64, month } = await req.json();

    const { data: settings } = await supabase
      .from('app_settings')
      .select('smtp_from_email, smtp_from_name')
      .single();

    const fromEmail = settings?.smtp_from_email ?? 'noreply@datafoot.app';
    const fromName  = settings?.smtp_from_name  ?? 'DataFoot';

    // Send via Resend (recommended) or SMTP
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY') ?? ''}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${fromName} <${fromEmail}>`,
        to: [to],
        subject: `DataFoot — Rapport de performance ${month}`,
        html: `<p>Bonjour <strong>${playerName}</strong>,<br>Veuillez trouver en pièce jointe votre rapport de performance pour ${month}.</p><p>L'équipe DataFoot</p>`,
        attachments: [{
          filename: `rapport_${month.replace(' ', '_')}.pdf`,
          content: pdfBase64,
        }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(err);
    }

    return new Response(JSON.stringify({ sent: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
