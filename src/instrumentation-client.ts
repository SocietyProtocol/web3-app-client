// instrumentation-client.js
import posthog from "posthog-js";
import { env } from "./lib/env";

if (env.posthogProjectToken) {
  // Initialize PostHog once
  posthog.init(env.posthogProjectToken, {
    api_host: env.posthogHost,
    capture_pageview: false,
    defaults: "2026-01-30", // The 'defaults' option sets recommended settings for new projects.
  });
} else {
  console.warn(
    "PostHog project token is not set. Skipping PostHog initialization.",
  );
}
