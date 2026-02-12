/**
 * Edge Function : envoi email "reset password" par Align via Resend.
 * Supabase n'envoie plus l'email ; cette fonction génère le lien recovery (Admin API)
 * et envoie un email 100 % custom via Resend.
 *
 * Secrets requis : RESEND_API_KEY, FROM_EMAIL, APP_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const FROM_EMAIL = Deno.env.get('FROM_EMAIL');
const APP_URL = Deno.env.get('APP_URL');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

/** Template HTML Align (fond #1A1B23, card #2E3240, CTA dégradé orange). Placeholder: {{CONFIRMATION_URL}} */
function getResetPasswordHtml(confirmationUrl: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Réinitialiser ton mot de passe</title>
</head>
<body style="margin:0; padding:0; font-family: 'Bowlby One SC', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #1A1B23;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #1A1B23; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 520px;">
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <span style="font-family: 'Bowlby One SC', Georgia, serif; font-size: 28px; font-weight: 800; letter-spacing: 2px; color: #FFFFFF;">ALIGN</span>
            </td>
          </tr>
          <tr>
            <td style="background-color: #2E3240; border-radius: 16px; padding: 32px 24px;">
              <h1 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #FFFFFF; text-align: center;">
                Mot de passe oublié ?
              </h1>
              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.5; color: rgba(255,255,255,0.9); text-align: center;">
                Clique ci-dessous pour réinitialiser ton mot de passe.
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <a href="${confirmationUrl}" style="display: inline-block; background: linear-gradient(90deg, #FF6000, #FFBB00); color: #FFFFFF; font-size: 16px; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 999px; letter-spacing: 0.5px;">
                      Réinitialiser mon mot de passe
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 24px 0 0 0; font-size: 12px; line-height: 1.4; color: rgba(255,255,255,0.5); text-align: center;">
                Lien de secours (si le bouton ne s'affiche pas) :<br>
                <a href="${confirmationUrl}" style="color: #FF7B2B; word-break: break-all;">${confirmationUrl}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding-top: 24px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: rgba(255,255,255,0.4);">Align — ta voie, ton rythme.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }

  const jsonHeaders = { 'Content-Type': 'application/json', ...cors };

  try {
    const body = await req.json().catch(() => ({}));
    const email = typeof body?.email === 'string' ? body.email.trim() : '';
    const clientRedirectTo = typeof body?.redirectTo === 'string' ? body.redirectTo.trim() : '';

    if (!email || !email.includes('@')) {
      return new Response(JSON.stringify({ ok: false, reason: 'invalid_email' }), { status: 200, headers: jsonHeaders });
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[send-reset-password-email] SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquants');
      return new Response(JSON.stringify({ ok: false, reason: 'config' }), { status: 200, headers: jsonHeaders });
    }

    const redirectTo =
      clientRedirectTo && clientRedirectTo.includes('/reset-password')
        ? clientRedirectTo.replace(/\/$/, '')
        : APP_URL
          ? `${APP_URL.replace(/\/$/, '')}/reset-password`
          : undefined;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: redirectTo ? { redirectTo } : undefined,
    });

    if (linkError) {
      console.warn('[send-reset-password-email] generateLink error (no user leak):', linkError.message);
      return new Response(JSON.stringify({ ok: false, reason: 'auth' }), { status: 200, headers: jsonHeaders });
    }

    const actionLink =
      linkData?.properties?.action_link ??
      (linkData as { action_link?: string })?.action_link ??
      '';

    if (!actionLink) {
      console.warn('[send-reset-password-email] aucun action_link dans la réponse');
      return new Response(JSON.stringify({ ok: false, reason: 'auth' }), { status: 200, headers: jsonHeaders });
    }

    if (!RESEND_API_KEY || !FROM_EMAIL) {
      console.error('[send-reset-password-email] RESEND_API_KEY ou FROM_EMAIL manquants');
      return new Response(JSON.stringify({ ok: false, reason: 'config' }), { status: 200, headers: jsonHeaders });
    }

    const html = getResetPasswordHtml(actionLink);
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [email],
        subject: 'Réinitialise ton mot de passe Align',
        html,
      }),
    });

    if (!resendRes.ok) {
      const errText = await resendRes.text();
      console.error('[send-reset-password-email] Resend error:', resendRes.status, errText);
      return new Response(JSON.stringify({ ok: false, reason: 'resend', status: resendRes.status }), { status: 200, headers: jsonHeaders });
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: jsonHeaders });
  } catch (e) {
    console.error('[send-reset-password-email] exception:', e);
    return new Response(JSON.stringify({ ok: false, reason: 'exception' }), { status: 200, headers: jsonHeaders });
  }
});
