/** Drop inlined data-URI images so GraphQL payloads stay small. */
export function stripDataUriImages<T>(value: T, depth = 0): T {
  if (depth > 12) {
    return value;
  }
  if (typeof value === "string") {
    return (value.startsWith("data:image/") ? null : value) as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => stripDataUriImages(item, depth + 1)) as T;
  }
  if (value && typeof value === "object") {
    const next: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      next[key] = stripDataUriImages(child, depth + 1);
    }
    return next as T;
  }
  return value;
}
