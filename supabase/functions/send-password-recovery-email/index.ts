/**
 * Edge Function : envoi email de récupération mot de passe 100% via Resend (Align).
 * - Génère le lien recovery via Supabase Admin API (sans envoyer d'email Supabase).
 * - Envoie un email personnalisé Align via Resend.
 *
 * Sécurité : si l'email n'existe pas, on répond success: true quand même (pas de leak).
 *
 * Secrets : RESEND_API_KEY, FROM_EMAIL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *           APP_URL ou WEB_URL_PROD (pour redirectTo)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const APP_URL = Deno.env.get('APP_URL');
const WEB_URL_PROD = Deno.env.get('WEB_URL_PROD');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

/** Resend attend `email@example.com` ou `Name <email@example.com>`. On normalise pour éviter 422 (smart quotes, espaces, etc.). */
function getFromEmail(): string {
  const raw = (Deno.env.get('FROM_EMAIL') || '').trim() || 'hello@align-app.fr';
  const match = raw.match(/<([^>]+)>/);
  const email = (match ? match[1] : raw).trim().toLowerCase();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return `Align <${email}>`;
  }
  return 'Align <hello@align-app.fr>';
}

function getWebUrl(): string | undefined {
  const url = (APP_URL || WEB_URL_PROD || '').trim().replace(/\/$/, '');
  return url || undefined;
}

/** Template HTML : thème dark Align #1A1B23 + #2E3240, texte blanc, fallbacks polices (pas de @font-face) */
function getResetPasswordHtml(confirmationUrl: string, firstName?: string): string {
  const greeting = firstName?.trim()
    ? `Salut <span style="color:#FF7B2B;">${escapeHtml(firstName.trim())}</span>,`
    : 'Salut,';
  return `<!DOCTYPE html>
<html lang="fr" style="margin:0; padding:0; background-color:#1A1B23;" bgcolor="#1A1B23">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
  <title>Reprends l'accès à ton parcours Align</title>
  <style type="text/css">html,body,.wrapper-bg{background-color:#1A1B23 !important}.card-bg{background-color:#2E3240 !important}</style>
</head>
<body style="margin:0; padding:0; background-color:#1A1B23; font-family: 'Nunito', Arial, sans-serif;" bgcolor="#1A1B23">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" class="wrapper-bg" style="background-color:#1A1B23;" bgcolor="#1A1B23">
    <tr>
      <td align="center" class="wrapper-bg" style="background-color:#1A1B23; padding:32px 16px;" bgcolor="#1A1B23">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px; width:100%;">
          <tr>
            <td align="center" class="wrapper-bg" style="padding-bottom:24px; background-color:#1A1B23;" bgcolor="#1A1B23">
              <span style="font-family: 'Bowlby One SC', 'Baloo 2', 'Luckiest Guy', 'Arial Black', Arial, sans-serif; font-size:28px; font-weight:800; letter-spacing:1px; text-transform:uppercase; color:#FFFFFF;">ALIGN</span>
            </td>
          </tr>
          <tr>
            <td class="card-bg" style="background-color:#2E3240; border-radius:16px; padding:36px 40px;" bgcolor="#2E3240">
              <h1 style="margin:0 0 20px 0; font-family: 'Nunito', Arial, sans-serif; font-size:24px; font-weight:800; color:#FFFFFF; text-align:center; line-height:1.4;">
                Mot de passe oublié ?
              </h1>
              <p style="margin:0 0 20px 0; font-size:18px; font-weight:700; font-family: 'Nunito', Arial, sans-serif; color:#FFFFFF; line-height:1.6;">
                ${greeting}
              </p>
              <p style="margin:0 0 16px 0; font-size:16px; font-weight:700; font-family: 'Nunito', Arial, sans-serif; color:#FFFFFF; line-height:1.6;">
                On dirait que tu as besoin d'un nouveau mot de passe.
              </p>
              <p style="margin:0 0 16px 0; font-size:16px; font-weight:700; font-family: 'Nunito', Arial, sans-serif; color:#FFFFFF; line-height:1.6;">
                Pas de stress.
              </p>
              <p style="margin:0 0 20px 0; font-size:16px; font-weight:700; font-family: 'Nunito', Arial, sans-serif; color:#CFCFCF; line-height:1.7;">
                Clique ci-dessous pour le réinitialiser et continuer ton parcours.
              </p>
              <p style="margin:0 0 24px 0; font-size:14px; font-weight:700; font-family: 'Nunito', Arial, sans-serif; color:#CFCFCF; line-height:1.6;">
                Si tu n'es pas à l'origine de cette demande, tu peux simplement ignorer cet email.
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <a href="${escapeHtml(confirmationUrl)}" style="display:inline-block; background:linear-gradient(90deg, #FF7B2B, #FFD93F); color:#FFFFFF; font-size:16px; font-weight:700; font-family: 'Nunito', Arial, sans-serif; text-decoration:none; padding:14px 22px; border-radius:12px; border:none; box-shadow:0 2px 8px rgba(0,0,0,0.15);">
                      Réinitialiser mon mot de passe
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0 0; font-size:12px; line-height:1.6; font-weight:700; font-family: 'Nunito', Arial, sans-serif; color:#AAAAAA;">
                Copie et colle ce lien dans ton navigateur :<br>
                <a href="${escapeHtml(confirmationUrl)}" style="color:#AAAAAA; word-break:break-all;">${escapeHtml(confirmationUrl)}</a>
              </p>
              <p style="margin:30px 0 0 0; font-size:14px; font-weight:700; font-family: 'Nunito', Arial, sans-serif; color:#AAAAAA; line-height:1.6;">
                Align — ta voie, ton rythme.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: jsonHeaders });
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[send-password-recovery-email] SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquants');
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: jsonHeaders });
    }

    // Ne jamais mettre localhost dans le lien email : en prod le lien doit ouvrir align-app.fr.
    const webUrl = getWebUrl();
    const prodResetUrl = webUrl ? `${webUrl}/reset-password` : undefined;
    const clientIsLocalhost = /localhost/i.test(clientRedirectTo || '');
    const redirectTo =
      clientRedirectTo && clientRedirectTo.includes('/reset-password') && !clientIsLocalhost
        ? clientRedirectTo.replace(/\/$/, '')
        : prodResetUrl;

    // #region agent log (Supabase Dashboard → Edge Functions → send-password-recovery-email → Logs)
    console.log('[send-password-recovery-email] redirect', {
      clientRedirectTo: clientRedirectTo || '(empty)',
      clientIsLocalhost,
      webUrl: webUrl || '(not set)',
      prodResetUrl: prodResetUrl || '(not set)',
      redirectToUsed: redirectTo || '(undefined)',
    });
    // #endregion

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: redirectTo ? { redirectTo } : undefined,
    });

    if (linkError) {
      console.warn('[send-password-recovery-email] generateLink error (no user leak):', linkError.message);
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: jsonHeaders });
    }

    const actionLink =
      linkData?.properties?.action_link ??
      (linkData as { action_link?: string })?.action_link ??
      '';

    if (!actionLink) {
      console.warn('[send-password-recovery-email] aucun action_link');
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: jsonHeaders });
    }

    if (!RESEND_API_KEY) {
      console.error('[send-password-recovery-email] RESULT: failure reason=config (RESEND_API_KEY manquant)');
      return new Response(JSON.stringify({ success: false }), { status: 200, headers: jsonHeaders });
    }

    const fromEmail = getFromEmail();
    const html = getResetPasswordHtml(actionLink);
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [email],
        subject: 'Reprends l\'accès à ton parcours Align',
        html,
      }),
    });

    if (!resendRes.ok) {
      const errText = await resendRes.text();
      console.error('[send-password-recovery-email] RESULT: failure reason=resend status=', resendRes.status, errText);
      return new Response(JSON.stringify({ success: false }), { status: 200, headers: jsonHeaders });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: jsonHeaders });
  } catch (e) {
    console.error('[send-password-recovery-email] RESULT: failure reason=exception', e);
    return new Response(JSON.stringify({ success: false }), { status: 200, headers: jsonHeaders });
  }
});
