import { createHash } from "node:crypto";
import imageCids from "./image-cids.generated.json";

const IMAGE_CIDS = imageCids as Record<string, string>;

export function dataUriKey(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

/** Replace inlined data-URI images with migrated CID URLs, or drop them. */
export function stripDataUriImages<T>(value: T, depth = 0): T {
  if (depth > 12) {
    return value;
  }
  if (typeof value === "string") {
    if (!value.startsWith("data:image/")) {
      return value;
    }
    return (IMAGE_CIDS[dataUriKey(value)] ?? null) as T;
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
