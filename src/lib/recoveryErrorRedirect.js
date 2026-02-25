/**
 * Boot : si le hash contient access_token/type=recovery -> forcer /reset-password (garder hash).
 * Si erreur recovery (otp_expired, etc.) -> rediriger vers /reset-password?recovery_error=1.
 * Importé en premier dans App.js, avant RootGate.
 */
import { redirectRecoveryTokenToResetPassword, redirectRecoveryErrorToResetPassword } from './recoveryUrl';

redirectRecoveryTokenToResetPassword();
redirectRecoveryErrorToResetPassword();
