import {
  POST_PAYMENT_RESUME_STATE,
  resolvePostPaywallResumeRoute,
} from './postPaywallResumeGate';

describe('resolvePostPaywallResumeRoute', () => {
  const validPayload = {
    sectorId: 'business_entrepreneuriat',
    sectorRanked: [{ id: 'business_entrepreneuriat', score: 0.8 }],
    needsDroitRefinement: false,
  };

  test('premium + resume_state => PostPaymentMetierBridge', () => {
    const out = resolvePostPaywallResumeRoute({
      decision: 'AppStackMain',
      onboardingStatus: 'complete',
      mainFeedPremiumOk: true,
      resumeState: POST_PAYMENT_RESUME_STATE,
      resumePayload: validPayload,
    });

    expect(out).toEqual({
      initialRouteName: 'PostPaymentMetierBridge',
      initialParams: validPayload,
    });
  });

  test('premium sans resume_state => flow normal', () => {
    const out = resolvePostPaywallResumeRoute({
      decision: 'AppStackMain',
      onboardingStatus: 'complete',
      mainFeedPremiumOk: true,
      resumeState: null,
      resumePayload: null,
    });

    expect(out).toBeNull();
  });

  test('non premium + resume_state => pas de bypass', () => {
    const out = resolvePostPaywallResumeRoute({
      decision: 'AppStackMain',
      onboardingStatus: 'complete',
      mainFeedPremiumOk: false,
      resumeState: POST_PAYMENT_RESUME_STATE,
      resumePayload: validPayload,
    });

    expect(out).toBeNull();
  });

  test('cleanup one-shot: payload manquant après clear => pas de redirection', () => {
    const out = resolvePostPaywallResumeRoute({
      decision: 'AppStackMain',
      onboardingStatus: 'complete',
      mainFeedPremiumOk: true,
      resumeState: POST_PAYMENT_RESUME_STATE,
      resumePayload: null,
    });

    expect(out).toBeNull();
  });
});
