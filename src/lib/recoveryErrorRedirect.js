/**
 * Boot : sauvegarder le hash recovery tout de suite ; si hash présent mais pas sur /reset-password -> forcer /reset-password (garder hash).
 * Si erreur recovery (otp_expired, etc.) -> rediriger vers /reset-password?recovery_error=1.
 * Importé en premier dans App.js, avant RootGate.
 */
import {
  persistRecoveryHashIfPresent,
  redirectRecoveryTokenToResetPassword,
  redirectRecoveryErrorToResetPassword,
} from './recoveryUrl';

persistRecoveryHashIfPresent();
redirectRecoveryTokenToResetPassword();
redirectRecoveryErrorToResetPassword();
