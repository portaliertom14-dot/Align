import { supabase } from './supabase';

/**
 * Service d'envoi d'email de bienvenue
 * 
 * TIMING : Email envoyé juste après l'écran IDENTITÉ (prénom/nom/username validés)
 * 
 * CONTENU EXACT :
 * - Objet : "Bienvenue sur Align, {firstName}"
 * - Corps :
 *   "Salut {firstName},
 *    Bienvenue sur Align !
 *    Tu viens de faire le premier pas pour clarifier ton avenir.
 *    Ici, tout est pensé pour t'aider à trouver une voie qui t'intéresse vraiment.
 *    On avance étape par étape."
 * - Pièce jointe : Mascotte étoile dorée (star-character.png)
 * 
 * SI L'EMAIL ÉCHOUE :
 * - L'app CONTINUE (email non bloquant)
 * - Log d'erreur côté serveur
 */

/**
 * Envoie un email de bienvenue à l'utilisateur
 * @param {object} userData - { email, firstName, username }
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function sendWelcomeEmail(userData) {
  const { email, firstName } = userData;

  try {
    // Appeler la fonction Edge de Supabase pour envoyer l'email
    const { data, error } = await supabase.functions.invoke('send-welcome-email', {
      body: {
        email,
        firstName,
      },
    });

    if (error) {
      console.error('[welcomeEmailService] Erreur lors de l\'envoi de l\'email:', error);
      // L'erreur est loggée mais l'app continue
      return { success: false, error: error.message };
    }

    if (__DEV__) console.log('[welcomeEmailService] Email de bienvenue envoyé avec succès');
    return { success: true };
  } catch (error) {
    console.error('[welcomeEmailService] Exception lors de l\'envoi de l\'email:', error);
    // L'erreur est loggée mais l'app continue
    return { success: false, error: error.message };
  }
}

/**
 * Template d'email de bienvenue (pour référence)
 * Ce template est implémenté côté serveur (Supabase Edge Function)
 * 
 * OBJET : "Bienvenue sur Align, {firstName}"
 * 
 * CORPS :
 * ---
 * Salut {firstName},
 * Bienvenue sur Align !
 * Tu viens de faire le premier pas pour clarifier ton avenir.
 * Ici, tout est pensé pour t'aider à trouver une voie qui t'intéresse vraiment.
 * On avance étape par étape.
 * ---
 * 
 * PIÈCE JOINTE :
 * - star-character.png (mascotte étoile dorée brillante)
 */
