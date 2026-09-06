type MetadataFields = {
  name?: string | null;
  bio?: string | null;
  imageUrl?: string | null;
  description?: string | null;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** Copy Metadata fields onto User/Badge/Community when the chain fields are empty. */
export function hydrateMetadata<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => hydrateMetadata(item)) as T;
  }
  if (!isPlainObject(value)) {
    return value;
  }

  const next: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    next[key] = hydrateMetadata(child);
  }

  const metadata = next.metadata;
  if (isPlainObject(metadata)) {
    const fields = metadata as MetadataFields;
    if (next.name == null && fields.name != null) next.name = fields.name;
    if (next.bio == null && fields.bio != null) next.bio = fields.bio;
    if (next.imageUrl == null && fields.imageUrl != null) {
      next.imageUrl = fields.imageUrl;
    }
    if (next.description == null && fields.description != null) {
      next.description = fields.description;
    }
  }

  return next as T;
}

/** Make absent GraphQL data a React Query error instead of a render crash. */
export function requireGraphData<T>(
  data: T | null | undefined,
  operationName: string,
): T {
  if (data === null || data === undefined) {
    throw new Error(`${operationName} data is unavailable. Please try again.`);
  }

  return hydrateMetadata(data);
}
