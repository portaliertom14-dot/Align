/**
 * RecoveryGate — Détection centralisée du flow "reset password" (Supabase type=recovery).
 * À utiliser AVANT toute logique onboarding : si isRecoveryFlow() === true, ne jamais
 * rediriger vers Onboarding/Main.
 *
 * Détection via URL (aucun token ni PII ne doit être logué) :
 * - pathname commence par /reset-password
 * - OU hash/search contient type=recovery
 * - OU hash/search contient access_token= ou refresh_token=
 * - OU hash/search contient error_code=otp_expired ou error=access_denied
 */
export {
  isRecoveryFlow,
  getRecoveryFlowActive,
  setRecoveryFlowActive,
  clearRecoveryFlowActive,
  captureResetPasswordHash,
  getResetPasswordHash,
  isRecoveryErrorInProgress,
} from './resetPasswordHashStore';
