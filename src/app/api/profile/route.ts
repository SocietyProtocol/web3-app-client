import { authenticateRequest } from "@/lib/auth";
import { pinJson } from "@/lib/filebase";
import { accountValidationSchema } from "@/validation/account";
import { NextRequest, NextResponse } from "next/server";
import { flattenError } from "zod";
import { URLS } from "@/consts/urls";

export interface ProfileResponse {
  uri: string;
}

export interface ProfileErrorResponse {
  error: string;
  details?: Record<string, string[]>;
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

  // Validate request body
  const validation = accountValidationSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: flattenError(validation.error).fieldErrors,
      },
      { status: 400 },
    );
  }

  const data = validation.data;

  // Prepare metadata for IPFS
  const metadata = {
    name: data.name,
    bio: data.bio || null,
    imageUrl: data.imageUrl || null,
    timestamp: new Date().toISOString(),
  };

  try {
    const cid = await pinJson(metadata);

    return NextResponse.json(
      { uri: `${URLS.IPFS_GATEWAY}/${cid}` } as ProfileResponse,
      { status: 200 },
    );
  } catch (error) {
    console.error("Account upload error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
