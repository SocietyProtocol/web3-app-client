import { pinata } from "@/lib/pinata";
import { authenticateRequest } from "@/lib/auth";
import { accountValidationSchema } from "@/validation/account";
import { NextRequest, NextResponse } from "next/server";
import { flattenError } from "zod";

export interface ProfileResponse {
  cid: string;
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
      { status: 401 }
    );
  }

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

  // Delete old IPFS data if updating existing profile
  // to be reviewed later
  //
  // if (data.cid) {
  //   // If CID is provided, we are updating existing data
  //   try {
  //     const filesResponse = await pinata.files.public.list().cid(data.cid);
  //     const id = filesResponse.files[0]?.id;

  //     if (id) {
  //       await pinata.files.public.delete([id]);
  //       console.log(`Unpinned old IPFS data with CID ${data.cid} and ID ${id}`);
  //     }
  //   } catch (error) {
  //     console.error("Failed to unpin old IPFS data:", error);
  //     // Proceeding even if unpinning fails
  //   }
  // }

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
