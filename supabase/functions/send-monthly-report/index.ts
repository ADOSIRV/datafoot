import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * This function is triggered monthly (via Supabase cron or external scheduler).
 * It fetches all players and sends their monthly performance report PDF via email.
 *
 * Body (optional): { month: "2025-01" }  — defaults to previous month
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  try {
    // Get SMTP settings
    const { data: settings } = await supabase
      .from('app_settings')
      .select('*')
      .single();

    if (!settings?.smtp_host) {
      return new Response(JSON.stringify({ error: 'SMTP not configured' }), { status: 400, headers: corsHeaders });
    }

    // Get all players
    const { data: players } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email')
      .eq('role', 'player')
      .eq('is_active', true);

    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
    const lastOfMonth  = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
    const monthLabel   = `${now.toLocaleString('fr-FR', { month: 'long', year: 'numeric' })}`;

    const results = [];
    for (const player of players ?? []) {
      const { data: sessions } = await supabase
        .from('performance_sessions')
        .select('*')
        .eq('player_id', player.id)
        .gte('session_date', firstOfMonth)
        .lte('session_date', lastOfMonth);

      if (!sessions?.length) continue;

      // Calculate summary
      const total_sessions = sessions.length;
      const best_total = Math.max(...sessions.map((s: { total: number }) => s.total));
      const avg_total = Math.round(sessions.reduce((a: number, s: { total: number }) => a + s.total, 0) / total_sessions);

      // Send email with summary (text-based since PDF generation requires browser)
      const emailBody = buildEmailHTML(player, sessions, { total_sessions, best_total, avg_total, monthLabel });

      await sendEmail(settings, {
        to: player.email,
        subject: `DataFoot — Rapport mensuel ${monthLabel}`,
        html: emailBody,
      });

      results.push({ player: `${player.first_name} ${player.last_name}`, sessions: total_sessions });
    }

    return new Response(JSON.stringify({ sent: results.length, details: results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildEmailHTML(player: any, sessions: any[], stats: any): string {
  const rows = sessions.slice(0, 20).map((s: any) => `
    <tr>
      <td style="padding:6px 12px;border-bottom:1px solid #f3f4f6">${s.session_date}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #f3f4f6;text-align:center">${s.right_foot}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #f3f4f6;text-align:center">${s.left_foot}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #f3f4f6;text-align:center">${s.head}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #f3f4f6;text-align:center;font-weight:bold">${s.total}</td>
    </tr>`).join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><title>Rapport DataFoot</title></head>
<body style="font-family:Inter,sans-serif;background:#f9fafb;margin:0;padding:20px">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1)">
    <div style="background:#2563eb;padding:24px;color:#fff">
      <h1 style="margin:0;font-size:24px">⚽ DataFoot</h1>
      <p style="margin:4px 0 0;opacity:.8">Rapport de performance — ${stats.monthLabel}</p>
    </div>
    <div style="padding:24px">
      <p>Bonjour <strong>${player.first_name} ${player.last_name}</strong>,</p>
      <p>Voici votre bilan de performance pour le mois de <strong>${stats.monthLabel}</strong>.</p>

      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:20px 0">
        <div style="background:#eff6ff;padding:16px;border-radius:8px;text-align:center">
          <div style="font-size:28px;font-weight:bold;color:#2563eb">${stats.total_sessions}</div>
          <div style="font-size:12px;color:#6b7280">Sessions</div>
        </div>
        <div style="background:#fef9c3;padding:16px;border-radius:8px;text-align:center">
          <div style="font-size:28px;font-weight:bold;color:#d97706">${stats.best_total}</div>
          <div style="font-size:12px;color:#6b7280">Meilleur total</div>
        </div>
        <div style="background:#f0fdf4;padding:16px;border-radius:8px;text-align:center">
          <div style="font-size:28px;font-weight:bold;color:#16a34a">${stats.avg_total}</div>
          <div style="font-size:12px;color:#6b7280">Moyenne</div>
        </div>
      </div>

      <h3 style="color:#111827;margin-top:24px">Détail des sessions</h3>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <thead>
          <tr style="background:#f9fafb">
            <th style="padding:8px 12px;text-align:left;color:#6b7280;font-size:12px">Date</th>
            <th style="padding:8px 12px;text-align:center;color:#6b7280;font-size:12px">Pied D</th>
            <th style="padding:8px 12px;text-align:center;color:#6b7280;font-size:12px">Pied G</th>
            <th style="padding:8px 12px;text-align:center;color:#6b7280;font-size:12px">Tête</th>
            <th style="padding:8px 12px;text-align:center;color:#6b7280;font-size:12px">Total</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div style="padding:16px 24px;background:#f9fafb;text-align:center;color:#9ca3af;font-size:12px">
      DataFoot — Application de suivi des performances footballistiques
    </div>
  </div>
</body>
</html>`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function sendEmail(settings: any, { to, subject, html }: { to: string; subject: string; html: string }) {
  // Using SMTP via fetch with a hypothetical SMTP-HTTP bridge.
  // In production: use Resend, SendGrid, or Mailgun API.
  const response = await fetch(`https://api.resend.com/emails`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY') ?? ''}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `${settings.smtp_from_name ?? 'DataFoot'} <${settings.smtp_from_email}>`,
      to: [to],
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Email failed: ${error}`);
  }
}
