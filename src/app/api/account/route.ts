import { pinata } from "@/lib/pinata";
import { accountValidationSchema } from "@/validation/account";
import { NextRequest, NextResponse } from "next/server";
import { flattenError } from "zod";

export interface AccountResponse {
  cid: string;
}

export interface AccountErrorResponse {
  error: string;
  details?: Record<string, string[]>;
}

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON in request body" },
      { status: 400 }
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
      { status: 400 }
    );
  }

  const data = validation.data;

  // Prepare metadata for IPFS
  const metadata = {
    name: data.name,
    bio: data.bio || null,
    avatar: data.avatar || null,
    referralCode: data.referralCode || null,
    timestamp: new Date().toISOString(),
  };

  if (data.cid) {
    // If CID is provided, we are updating existing data
    try {
      await pinata.files.public.delete([data.cid]);
    } catch (error) {
      console.error("Failed to delete old IPFS data:", error);
      // Proceeding even if deletion fails
    }
  }

  try {
    const { cid } = await pinata.upload.public.json(metadata);

    return NextResponse.json({ cid }, { status: 200 });
  } catch (error) {
    console.error("Account upload error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
