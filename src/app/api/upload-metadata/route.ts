import { pinata } from "@/lib/pinata";
import { authenticateRequest } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { URLS } from "@/config/const";

export interface UploadMetadataResponse {
  uri: string;
}

export interface UploadMetadataErrorResponse {
  error: string;
}

export async function POST(request: NextRequest) {
  // Authenticate the request
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

  // Basic validation - ensure it's an object
  if (typeof body !== "object" || body === null) {
    return NextResponse.json(
      { error: "Request body must be a valid object" },
      { status: 400 },
    );
  }

  try {
    // Upload to IPFS via Pinata (using public endpoint like profile route does)
    const { cid } = await pinata.upload.public.json(
      body as Record<string, unknown>,
    );

    const uri = `${URLS.IPFS_GATEWAY}/${cid}`;

    return NextResponse.json<UploadMetadataResponse>({ uri }, { status: 200 });
  } catch (error) {
    console.error("Error uploading to IPFS:", error);

    return NextResponse.json(
      { error: "Failed to upload metadata to IPFS" },
      { status: 500 },
    );
  }
}
