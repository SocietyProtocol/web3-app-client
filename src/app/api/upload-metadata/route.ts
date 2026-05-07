import { pinata } from "@/lib/pinata";
import { authenticateRequest } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { URLS } from "@/consts/urls";

export interface UploadMetadataResponse {
  uris: string[];
}

export interface UploadMetadataErrorResponse {
  error: string;
}

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);

  if (!auth.authenticated) {
    return NextResponse.json(
      { error: auth.error || "Authentication required" },
      { status: 401 },
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON in request body" },
      { status: 400 },
    );
  }

  const items: unknown[] = Array.isArray(body) ? body : [body];

  if (items.length === 0) {
    return NextResponse.json(
      {
        error:
          "Request body must contain at least one metadata object (as an object or array)",
      },
      { status: 400 },
    );
  }

  for (const item of items) {
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      return NextResponse.json(
        { error: "Each item must be a valid object" },
        { status: 400 },
      );
    }
  }

  try {
    const results = await Promise.all(
      items.map((item) =>
        pinata.upload.public.json(item as Record<string, unknown>),
      ),
    );

    const uris = results.map(({ cid }) => `${URLS.IPFS_GATEWAY}/${cid}`);

    return NextResponse.json<UploadMetadataResponse>({ uris }, { status: 200 });
  } catch (error) {
    console.error("Error uploading to IPFS:", error);

    return NextResponse.json(
      { error: "Failed to upload metadata to IPFS" },
      { status: 500 },
    );
  }
}
