import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Fonction Edge Supabase - Envoi d'email de bienvenue
 * 
 * TIMING : Appelée juste après l'écran IDENTITÉ (prénom validé)
 * 
 * CONTENU :
 * - Email personnalisé avec le prénom
 * - Ton chaleureux et motivant
 * - Mention de la mascotte en pièce jointe
 * - Aucun lien cassé
 * - Aucun jargon technique
 * 
 * SERVICE EMAIL : Utilise Resend (ou SendGrid, Mailgun selon config)
 */

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const FROM_EMAIL = 'Align <noreply@align-app.com>';

interface WelcomeEmailRequest {
  email: string;
  firstName: string;
}

serve(async (req) => {
  try {
    // CORS headers
    if (req.method === 'OPTIONS') {
      return new Response('ok', {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        },
      });
    }

    // Vérifier que l'API key Resend est configurée
    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY non configurée');
      return new Response(
        JSON.stringify({ error: 'Service email non configuré' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Parser la requête
    const { email, firstName }: WelcomeEmailRequest = await req.json();

    if (!email || !firstName) {
      return new Response(
        JSON.stringify({ error: 'Email et prénom requis' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Construire l'email HTML
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.8;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .content {
              background: #ffffff;
              padding: 40px;
              border-radius: 12px;
            }
            .message {
              font-size: 16px;
              color: #333;
              margin-bottom: 12px;
            }
            .greeting {
              font-weight: 600;
            }
          </style>
        </head>
        <body>
          <div class="content">
            <p class="message greeting">Salut ${firstName},</p>
            <p class="message">Bienvenue sur Align !</p>
            <p class="message">Tu viens de faire le premier pas pour clarifier ton avenir.</p>
            <p class="message">Ici, tout est pensé pour t'aider à trouver une voie qui t'intéresse vraiment.</p>
            <p class="message">On avance étape par étape.</p>
          </div>
        </body>
      </html>
    `;

    // Envoyer l'email via Resend
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: email,
        subject: `Bienvenue sur Align, ${firstName}`,
        html: htmlContent,
        // TODO: Ajouter la mascotte en pièce jointe
        // La mascotte est située dans /assets/images/star-character.png
        // Elle doit être convertie en base64 et attachée :
        // attachments: [{
        //   filename: 'align_mascot.png',
        //   content: base64ImageData,
        // }]
      }),
    });

    if (!resendResponse.ok) {
      const error = await resendResponse.text();
      console.error('Erreur Resend:', error);
      throw new Error(`Resend API error: ${error}`);
    }

    const data = await resendResponse.json();

    console.log('Email de bienvenue envoyé avec succès:', { email, firstName });

    return new Response(
      JSON.stringify({ success: true, data }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'email:', error);
    
    // Retourner une erreur mais ne pas bloquer l'app
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        note: 'L\'erreur a été loggée mais l\'app peut continuer'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});
