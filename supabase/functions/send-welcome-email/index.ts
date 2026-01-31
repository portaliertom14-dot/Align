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
// CRITICAL: Utiliser align-app.fr (domaine vérifié dans Resend) au lieu de align-app.com
const FROM_EMAIL = 'hello@align-app.fr';

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

    // CRITICAL: Logger FROM_EMAIL pour confirmer le changement
    console.log('[send-welcome-email] FROM_EMAIL configuré:', FROM_EMAIL);
    console.log('[send-welcome-email] Domaine:', FROM_EMAIL.split('@')[1]);

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

    // CRITICAL: Générer l'URL de l'image star.png depuis Supabase Storage (bucket email-assets)
    let starImageUrl = null;
    try {
      // Créer un client Supabase avec service_role pour accéder au Storage
      const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://yuqybxhqhgmeqmcpgtvw.supabase.co';
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      
      if (supabaseServiceKey) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        
        // Extraire le PROJECT_REF de l'URL Supabase
        // Format: https://<PROJECT_REF>.supabase.co
        const urlMatch = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
        const projectRef = urlMatch ? urlMatch[1] : null;
        
        if (!projectRef) {
          console.warn('[send-welcome-email] ⚠️ Impossible d\'extraire PROJECT_REF de SUPABASE_URL:', supabaseUrl);
        } else {
          // Essayer d'abord l'URL publique (si le bucket est public)
          const publicUrl = `https://${projectRef}.supabase.co/storage/v1/object/public/email-assets/star.png`;
          
          // Vérifier si le bucket est public en testant l'accès
          try {
            const testResponse = await fetch(publicUrl, { method: 'HEAD' });
            if (testResponse.ok) {
              // Bucket est public, utiliser l'URL publique
              starImageUrl = publicUrl;
              console.log('[send-welcome-email] ✅ Bucket email-assets est PUBLIC, URL publique utilisée');
            } else {
              // Bucket est privé, générer une signed URL
              const { data: signedUrlData, error: signedUrlError } = await supabase.storage
                .from('email-assets')
                .createSignedUrl('star.png', 3600); // URL valide 1 heure
              
              if (!signedUrlError && signedUrlData?.signedUrl) {
                starImageUrl = signedUrlData.signedUrl;
                console.log('[send-welcome-email] ✅ Bucket email-assets est PRIVÉ, signed URL générée');
              } else {
                console.warn('[send-welcome-email] ⚠️ Impossible de générer signed URL:', signedUrlError?.message);
              }
            }
          } catch (testError) {
            // Si le test échoue, essayer de générer une signed URL
            console.log('[send-welcome-email] Test URL publique échoué, génération signed URL...');
            const { data: signedUrlData, error: signedUrlError } = await supabase.storage
              .from('email-assets')
              .createSignedUrl('star.png', 3600);
            
            if (!signedUrlError && signedUrlData?.signedUrl) {
              starImageUrl = signedUrlData.signedUrl;
              console.log('[send-welcome-email] ✅ Signed URL générée (fallback)');
            } else {
              console.warn('[send-welcome-email] ⚠️ Impossible de générer signed URL:', signedUrlError?.message);
            }
          }
        }
      } else {
        console.warn('[send-welcome-email] ⚠️ SUPABASE_SERVICE_ROLE_KEY non configurée, image non chargée');
      }
    } catch (imageUrlError) {
      console.error('[send-welcome-email] Erreur génération URL image:', imageUrlError);
      // Continuer sans l'image si la génération d'URL échoue
    }

    // Log de debug pour l'URL finale
    if (starImageUrl) {
      console.log('[send-welcome-email] EMAIL_IMAGE_URL:', starImageUrl);
    } else {
      console.warn('[send-welcome-email] ⚠️ Aucune URL image disponible');
    }

    // Construire l'email HTML avec l'image star.png si disponible
    // CRITICAL: Utiliser URL HTTPS complète, width fixe, display:block pour compatibilité email
    const imageTag = starImageUrl 
      ? `<div style="text-align: center; margin: 30px 0;">
           <img src="${starImageUrl}" alt="Align" width="180" style="max-width: 180px; height: auto; display: block; margin: 0 auto;" />
         </div>`
      : '';
    
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
            ${imageTag}
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
