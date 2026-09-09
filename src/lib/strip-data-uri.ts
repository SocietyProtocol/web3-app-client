import { createHash } from "node:crypto";
import imageCids from "./image-cids.generated.json";
import imageEntityCids from "./image-entity-cids.generated.json";

const IMAGE_CIDS = imageCids as Record<string, string>;
const IMAGE_ENTITY_CIDS = imageEntityCids as Record<string, string>;

export function dataUriKey(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function isBlankImage(value: unknown): boolean {
  return (
    value == null ||
    value === "" ||
    (typeof value === "string" && value.startsWith("data:image/"))
  );
}

function mappedEntityImage(id: unknown): string | null {
  if (typeof id !== "string" || id.length === 0) return null;
  return IMAGE_ENTITY_CIDS[id] ?? IMAGE_ENTITY_CIDS[id.toLowerCase()] ?? null;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
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
  if (isPlainObject(value)) {
    const next: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value)) {
      next[key] = stripDataUriImages(child, depth + 1);
    }
    if (Object.hasOwn(next, "imageUrl")) {
      const mapped = mappedEntityImage(next.id);
      if (mapped && isBlankImage(next.imageUrl)) {
        next.imageUrl = mapped;
      }
    }
    const metadata = next.metadata;
    if (
      isPlainObject(metadata) &&
      Object.hasOwn(metadata, "imageUrl") &&
      isBlankImage(metadata.imageUrl) &&
      typeof next.imageUrl === "string" &&
      next.imageUrl.startsWith("http")
    ) {
      metadata.imageUrl = next.imageUrl;
    }
    return next as T;
  }
  return value;
}
