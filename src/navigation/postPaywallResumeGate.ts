export const POST_PAYMENT_RESUME_STATE = 'post_payment_metier_bridge';

export interface PostPaywallResumePayload {
  sectorId: string;
  sectorRanked: Array<{ id?: string; secteurId?: string; score?: number }>;
  needsDroitRefinement: boolean;
  variantOverride?: unknown;
}

export interface ResolvePostPaywallResumeInput {
  decision: string;
  onboardingStatus: string;
  mainFeedPremiumOk: boolean;
  resumeState?: string | null;
  resumePayload?: unknown;
}

export interface ResolvedPostPaywallResumeRoute {
  initialRouteName: 'PostPaymentMetierBridge';
  initialParams: PostPaywallResumePayload;
}

export function isPostPaywallResumePayload(value: unknown): value is PostPaywallResumePayload {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  if (typeof v.sectorId !== 'string' || v.sectorId.trim().length === 0) return false;
  if (!Array.isArray(v.sectorRanked)) return false;
  if (typeof v.needsDroitRefinement !== 'boolean') return false;
  return true;
}

export function resolvePostPaywallResumeRoute(
  input: ResolvePostPaywallResumeInput,
): ResolvedPostPaywallResumeRoute | null {
  const shouldCheckMain =
    input.decision === 'AppStackMain' || input.onboardingStatus === 'complete';
  if (!shouldCheckMain) return null;
  if (!input.mainFeedPremiumOk) return null;
  if (input.resumeState !== POST_PAYMENT_RESUME_STATE) return null;
  if (!isPostPaywallResumePayload(input.resumePayload)) return null;

  const payload = input.resumePayload;
  return {
    initialRouteName: 'PostPaymentMetierBridge',
    initialParams: {
      sectorId: payload.sectorId,
      sectorRanked: payload.sectorRanked,
      needsDroitRefinement: payload.needsDroitRefinement,
      ...(payload.variantOverride != null ? { variantOverride: payload.variantOverride } : {}),
    },
  };
}
