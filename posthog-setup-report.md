<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into the Align Expo app. Here's a summary of all changes made:

## Files created

- **`app.config.js`** — Replaces `app.json` as Expo config entry point; exposes `posthogProjectToken` and `posthogHost` via `extra` field (read from `.env`).
- **`src/config/posthog.js`** — Singleton PostHog client configured via `expo-constants`. Disabled automatically if token is not set.
- **`.env`** — PostHog `POSTHOG_PROJECT_TOKEN` and `POSTHOG_HOST` environment variables written (via wizard-tools, never hardcoded).

## Files modified

- **`App.js`** — Wrapped `AppContent` with `PostHogProvider` (autocapture touches enabled, screen tracking manual).
- **`src/context/AuthContext.js`** — Captures `user_logged_out` and calls `posthog.reset()` on sign out.
- **`src/screens/Auth/LoginScreen.js`** — Captures `user_logged_in` + `posthog.identify()` on successful login.
- **`src/screens/Onboarding/AuthScreen.js`** — Captures `user_signed_up` + `posthog.identify()` on successful account creation.
- **`src/screens/Onboarding/OnboardingFlow.js`** — Captures `onboarding_completed` with `first_name` and `username` properties.
- **`src/screens/Paywall/index.js`** — Captures `paywall_viewed` on mount and `checkout_initiated` when user taps CTA.
- **`src/screens/PaywallSuccess/index.js`** — Captures `checkout_completed` when Stripe redirects back with `checkout=success`.
- **`src/screens/ResultJob/index.js`** — Captures `job_result_viewed` with `job_title`, `sector_id`, and `has_premium_access` once premium access is confirmed.

## Events instrumented

| Event | Description | File |
|---|---|---|
| `user_signed_up` | New user creates an account during onboarding | `src/screens/Onboarding/AuthScreen.js` |
| `user_logged_in` | Existing user logs in successfully | `src/screens/Auth/LoginScreen.js` |
| `onboarding_completed` | User finishes onboarding (UserInfo → Quiz) | `src/screens/Onboarding/OnboardingFlow.js` |
| `paywall_viewed` | Paywall screen mounts | `src/screens/Paywall/index.js` |
| `checkout_initiated` | User taps the CTA to start Stripe checkout | `src/screens/Paywall/index.js` |
| `checkout_completed` | Stripe redirects back with checkout=success | `src/screens/PaywallSuccess/index.js` |
| `job_result_viewed` | Job result shown to a premium user | `src/screens/ResultJob/index.js` |
| `user_logged_out` | User signs out (triggers posthog.reset()) | `src/context/AuthContext.js` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- **Dashboard — Analytics basics**: https://us.posthog.com/project/381686/dashboard/1465191
- **Conversion Funnel (Signup → Checkout)**: https://us.posthog.com/project/381686/insights/t9VlSYSB
- **Daily New Signups**: https://us.posthog.com/project/381686/insights/gfT2ZHpU
- **Paywall → Checkout Conversion Rate**: https://us.posthog.com/project/381686/insights/s8PBvGUD
- **Daily Logouts (Churn Signal)**: https://us.posthog.com/project/381686/insights/fchAbWw0
- **Job Result Views by Sector**: https://us.posthog.com/project/381686/insights/0B08S7qB

### Agent skill

We've left an agent skill folder in your project at `.claude/skills/integration-expo/`. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
