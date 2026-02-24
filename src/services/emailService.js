import { supabase } from './supabase';

/** Désactivation temporaire de tous les envois d'emails (bienvenue + récupération MDP). Remettre à false pour réactiver. */
export const DISABLE_EMAILS = true;

/** Emails de bienvenue — désactivés si DISABLE_EMAILS est true */
const WELCOME_EMAIL_ENABLED = !DISABLE_EMAILS;

/**
 * Service d'email pour Align
 * Envoie des emails personnalisés aux utilisateurs
 * 
 * Utilise Supabase Edge Functions pour l'envoi d'emails
 * Si les Edge Functions ne sont pas configurées, les emails sont loggés
 */

/**
 * Génère le template HTML de l'email de bienvenue
 * @param {string} firstName - Prénom de l'utilisateur
 * @returns {string} HTML de l'email
 */
function generateWelcomeEmailTemplate(firstName) {
  // Utiliser le prénom ou "utilisateur" par défaut
  const displayName = firstName || 'utilisateur';
  
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bienvenue sur Align</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: #ffffff;
      border-radius: 12px;
      padding: 40px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .mascot-container {
      text-align: center;
      margin-bottom: 30px;
    }
    .mascot {
      max-width: 180px;
      height: auto;
      margin: 0 auto;
      display: block;
    }
    h1 {
      color: #00AAFF;
      font-size: 28px;
      margin: 0 0 10px;
      font-weight: bold;
    }
    .greeting {
      font-size: 18px;
      color: #333333;
      margin-bottom: 20px;
    }
    .content {
      font-size: 16px;
      color: #555555;
      margin-bottom: 20px;
      line-height: 1.8;
    }
    .signature {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
      font-size: 14px;
      color: #888888;
      text-align: center;
    }
    .footer {
      margin-top: 30px;
      text-align: center;
      font-size: 12px;
      color: #999999;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>ALIGN</h1>
    </div>
    
    <div class="mascot-container">
      <!-- Mascotte: étoile Align (sera incluse comme pièce jointe avec Content-ID: mascot-align) -->
      <img src="cid:mascot-align" alt="Mascotte Align" class="mascot" />
    </div>
    
    <p class="greeting">Salut ${displayName},</p>
    
    <div class="content">
      <p>Bienvenue sur Align !</p>
      
      <p>Tu viens de faire le premier pas pour clarifier ton avenir.</p>
      
      <p>Ici, tout est pensé pour t'aider à trouver une voie qui t'intéresse vraiment.</p>
      
      <p>On avance étape par étape.</p>
    </div>
    
    <div class="signature">
      <p><strong>— L'équipe Align</strong></p>
    </div>
    
    <div class="footer">
      <p>Cet email a été envoyé par Align. Si tu as des questions, n'hésite pas à nous contacter.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Génère la version texte de l'email de bienvenue
 * @param {string} firstName - Prénom de l'utilisateur
 * @returns {string} Version texte de l'email
 */
function generateWelcomeEmailText(firstName) {
  const displayName = firstName || 'utilisateur';
  
  return `
Salut ${displayName}, bienvenue sur Align !

Tu viens de faire le premier pas pour clarifier ton avenir.

Ici, tout est pensé pour t'aider à trouver une voie qui t'intéresse vraiment.

On avance étape par étape.

— L'équipe Align
  `.trim();
}

/**
 * Envoie l'email de bienvenue à un utilisateur
 * @param {string} email - Adresse email de l'utilisateur
 * @param {string} firstName - Prénom de l'utilisateur
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export async function sendWelcomeEmail(email, firstName) {
  try {
    if (DISABLE_EMAILS) {
      console.log('[EMAIL] [INFO] Emails désactivés temporairement — bienvenue non envoyé');
      return { success: true, actuallySent: false, error: null };
    }
    // Validation des paramètres
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      console.error('[EMAIL] [ERREUR] Email invalide:', email);
      return { success: false, error: 'Email invalide' };
    }

    if (!firstName || typeof firstName !== 'string' || firstName.trim().length === 0) {
      console.error('[EMAIL] [ERREUR] Prenom invalide ou manquant:', firstName);
      return { success: false, error: 'Prénom invalide ou manquant' };
    }

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedFirstName = firstName.trim();

    if (__DEV__) console.log('[EMAIL] [ENVOI] Envoi email bienvenue (destinataire non loggé en prod)');

    // Option 1: Utiliser Supabase Edge Function si disponible
    try {
      // CRITICAL: Vérifier qu'une session existe avant d'appeler l'Edge Function
      // L'erreur 401 se produit si pas de session/token valide
      const { data: sessionData } = await supabase.auth.getSession();
      
      if (!sessionData?.session?.access_token) {
        if (__DEV__) console.warn('[EMAIL] Pas de session active, Edge Function non appelée');
        // CRITICAL: Retourner success pour ne pas bloquer l'onboarding, mais actuallySent: false
        return { success: true, actuallySent: false, error: null, warning: 'Pas de session - email non envoyé' };
      }
      
      if (__DEV__) console.log('[EMAIL] Session trouvée, appel Edge Function');
      
      const { data, error } = await supabase.functions.invoke('send-welcome-email', {
        body: {
          email: normalizedEmail,
          firstName: normalizedFirstName,
          subject: 'Bienvenue sur Align',
          html: generateWelcomeEmailTemplate(normalizedFirstName),
          text: generateWelcomeEmailText(normalizedFirstName),
        },
      });

      if (error) {
        // Gérer spécifiquement l'erreur 401 (non autorisé)
        const is401 = error.status === 401 || error.message?.includes('401') || error.message?.includes('Unauthorized');
        if (is401) {
          if (__DEV__) console.warn('[EMAIL] 401 Edge Function');
        } else {
          if (__DEV__) console.error('[EMAIL] Erreur Edge Function:', error?.message ?? error);
        }
        // CRITICAL: Retourner success pour ne pas bloquer l'onboarding, mais actuallySent: false
        return { success: true, actuallySent: false, error: null, warning: error.message || 'Edge Function error' };
      }

      // Vérifier si l'email a été envoyé ou s'il y a un avertissement (limitation Resend)
      if (data?.warning || data?.skipped) {
        console.warn('[EMAIL] [AVERTISSEMENT] Email non envoye (limitation Resend):', data.warning || data.message);
        console.log('[EMAIL] [INFO] L\'onboarding continue normalement. Pour activer l\'envoi d\'emails, verifiez un domaine dans Resend.');
        // Retourner success: true pour ne pas bloquer l'onboarding, mais actuallySent: false
        return { success: true, actuallySent: false, error: null, warning: data.warning };
      }

      if (__DEV__) console.log('[EMAIL] Succès envoi via Edge Function');
      // CRITICAL: actuallySent: true seulement si l'email a vraiment été envoyé (2xx)
      return { success: true, actuallySent: true, error: null };
    } catch (edgeFunctionError) {
      // Edge Function non disponible ou erreur réseau
      if (__DEV__) console.warn('[EMAIL] Edge Function non disponible');
      
      // En production, vous pourriez ici appeler un service externe (Resend, SendGrid, etc.)
      // Exemple:
      // const response = await fetch('https://api.resend.com/emails', {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Bearer ${RESEND_API_KEY}`,
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({
      //     from: 'Align <noreply@align.app>',
      //     to: normalizedEmail,
      //     subject: `Bienvenue sur Align, ${normalizedFirstName} 👋`,
      //     html: generateWelcomeEmailTemplate(normalizedFirstName),
      //     text: generateWelcomeEmailText(normalizedFirstName),
      //   }),
      // });

      // Pour l'instant, on retourne success: true en mode développement
      // pour ne pas bloquer le flux d'onboarding
      const isDevelopment = __DEV__ || process.env.NODE_ENV === 'development';
      
      if (isDevelopment) {
        console.log('[EMAIL] [SUCCES] [DEVELOPPEMENT] Email logge (pas d\'envoi reel en dev)');
        // CRITICAL: actuallySent: false car l'email n'a pas vraiment été envoyé
        return { success: true, actuallySent: false, error: null };
      } else {
        // En production, si pas de Edge Function, on retourne une erreur
        return { success: false, actuallySent: false, error: 'Service d\'email non configuré' };
      }
    }
  } catch (error) {
    console.error('[EMAIL] [ERREUR] Erreur inattendue lors de l\'envoi de l\'email:', error);
    return { success: false, error: error.message || 'Erreur inattendue' };
  }
}

/**
 * Vérifie si l'email de bienvenue a déjà été envoyé à un utilisateur
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise<boolean>} true si l'email a déjà été envoyé
 */
export async function hasWelcomeEmailBeenSent(userId) {
  try {
    // Vérifier dans la table profiles si un flag welcome_email_sent existe
    const { data, error } = await supabase
      .from('user_profiles')
      .select('welcome_email_sent')
      .eq('id', userId)
      .single();

    if (error) {
      // Si la colonne n'existe pas encore, on considère que l'email n'a pas été envoyé
      if (error.code === 'PGRST116' || error.code === '42703') {
        return false;
      }
      console.error('[EMAIL] Erreur lors de la vérification du flag welcome_email_sent:', error);
      return false;
    }

    return data?.welcome_email_sent === true;
  } catch (error) {
    console.error('[EMAIL] Erreur lors de la vérification si l\'email a été envoyé:', error);
    return false;
  }
}

/**
 * Marque l'email de bienvenue comme envoyé pour un utilisateur
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export async function markWelcomeEmailAsSent(userId) {
  try {
    // Mettre à jour le profil avec le flag welcome_email_sent ET le timestamp
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('user_profiles')
      .upsert({
        id: userId,
        welcome_email_sent: true,
        welcome_email_sent_at: now,  // Enregistrer la date/heure d'envoi
        updated_at: now,
      }, {
        onConflict: 'id',
      })
      .select()
      .single();

    if (error) {
      // Si la colonne n'existe pas encore, on log juste (elle sera créée plus tard via migration SQL)
      if (error.code === '42703') {
        console.warn('[EMAIL] [AVERTISSEMENT] Colonne welcome_email_sent n\'existe pas encore. Creez-la via migration SQL.');
        // Sauvegarder dans AsyncStorage comme fallback
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        await AsyncStorage.setItem(`@align_welcome_email_sent_${userId}`, 'true');
        return { success: true, error: null };
      }
      console.error('[EMAIL] Erreur lors de la mise à jour du flag welcome_email_sent:', error);
      return { success: false, error: error.message || 'Erreur lors de la mise à jour' };
    }

    if (__DEV__) console.log('[EMAIL] Flag welcome_email_sent mis à jour');
    return { success: true, error: null };
  } catch (error) {
    console.error('[EMAIL] Erreur lors de la mise à jour du flag:', error);
    return { success: false, error: error.message || 'Erreur inattendue' };
  }
}

/**
 * Envoie l'email de bienvenue si les conditions sont remplies
 * Conditions:
 * - Email valide
 * - Prénom valide et non vide
 * - Email n'a pas déjà été envoyé
 * @param {string} userId - ID de l'utilisateur
 * @param {string} email - Adresse email de l'utilisateur
 * @param {string} firstName - Prénom de l'utilisateur
 * @returns {Promise<{success: boolean, sent: boolean, error: string|null}>}
 */
export async function sendWelcomeEmailIfNeeded(userId, email, firstName) {
  try {
    if (!WELCOME_EMAIL_ENABLED) {
      if (__DEV__) console.log('[EMAIL] Email bienvenue désactivé');
      return { success: true, sent: false, error: null };
    }
    // Validation
    if (!userId || !email || !firstName) {
      if (__DEV__) console.error('[EMAIL] Paramètres manquants');
      return { success: false, sent: false, error: 'Paramètres manquants' };
    }

    // Vérifier si l'email a déjà été envoyé
    const alreadySent = await hasWelcomeEmailBeenSent(userId);
    if (alreadySent) {
      if (__DEV__) console.log('[EMAIL] Email bienvenue déjà envoyé');
      return { success: true, sent: false, error: null };
    }

    // Vérifier que le prénom est valide
    if (typeof firstName !== 'string' || firstName.trim().length === 0) {
      if (__DEV__) console.error('[EMAIL] Prénom invalide ou vide');
      return { success: false, sent: false, error: 'Prénom invalide ou vide' };
    }

    // Envoyer l'email
    const result = await sendWelcomeEmail(email, firstName);
    
    // CRITICAL: Ne marquer comme envoyé QUE si l'email a vraiment été envoyé (2xx)
    // Ne pas marquer si fallback, 401, ou warning
    if (result.success && result.actuallySent === true) {
      // Marquer l'email comme envoyé uniquement si vraiment envoyé
      await markWelcomeEmailAsSent(userId);
      if (__DEV__) console.log('[EMAIL] Email bienvenue envoyé et marqué');
      return { success: true, sent: true, error: null };
    } else if (result.success && result.actuallySent === false) {
      // Email non envoyé (fallback, 401, etc.) mais onboarding continue
      if (__DEV__) console.warn('[EMAIL] Email non envoyé, flag non mis à jour');
      return { success: true, sent: false, error: null, warning: result.warning || 'Email not actually sent' };
    } else {
      console.error('[EMAIL] [ERREUR] Échec de l\'envoi de l\'email:', result.error);
      return { success: false, sent: false, error: result.error };
    }
  } catch (error) {
    console.error('[EMAIL] [ERREUR] Erreur inattendue lors de l\'envoi conditionnel:', error);
    return { success: false, sent: false, error: error.message || 'Erreur inattendue' };
  }
}
