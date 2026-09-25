import posthog from "posthog-js";

// Next.js runs this file once, in the browser, before the app hydrates —
// the earliest place PostHog can be initialised. See
// https://posthog.com/docs/libraries/next-js
//
// Everything here is opt-in: with no project token configured (CI, preview
// builds, a fresh clone) PostHog is never initialised and `track()` in
// lib/analytics.ts becomes a no-op.

// NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN is the name the current PostHog docs use.
// NEXT_PUBLIC_POSTHOG_KEY is still what a lot of setup guides (and the PostHog
// wizard's older output) call it, so accept either rather than silently
// recording nothing.
const token =
  process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN ||
  process.env.NEXT_PUBLIC_POSTHOG_KEY;

if (token) {
  const isDev = process.env.NODE_ENV === "development";
  const captureInDev = process.env.NEXT_PUBLIC_POSTHOG_DEV === "true";

  posthog.init(token, {
    api_host:
      process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
    // Pins the SDK's default configuration. Bump deliberately, and re-check
    // autocapture/session-replay behaviour when you do.
    defaults: "2026-05-30",
    // Never call identify() on a marketing site, so this keeps visitors
    // anonymous: no person profiles, no cross-session identity.
    person_profiles: "identified_only",
    // Local reloads are not traffic. Opt out in development so iterating on
    // the UI doesn't flood the production numbers, and set
    // NEXT_PUBLIC_POSTHOG_DEV=true when you actually want to see events
    // land in PostHog while wiring things up.
    opt_out_capturing_by_default: isDev && !captureInDev,
  });

  if (isDev && captureInDev) {
    posthog.debug();
  }
}
