import posthog from "posthog-js";

type PostHogProperties = Record<string, unknown>;

export const isPostHogEnabled = Boolean(
  process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN,
);

const sanitizePostHogValue = (value: unknown): unknown => {
  if (typeof value === "bigint") {
    return value.toString();
  }

  if (Array.isArray(value)) {
    return value.map(sanitizePostHogValue);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [
        key,
        sanitizePostHogValue(nestedValue),
      ]),
    );
  }

  return value;
};

export const capturePostHogEvent = (
  eventName: string,
  properties?: PostHogProperties,
) => {
  if (!isPostHogEnabled) {
    return;
  }

  posthog.capture(
    eventName,
    properties
      ? (sanitizePostHogValue(properties) as PostHogProperties)
      : undefined,
  );
};
