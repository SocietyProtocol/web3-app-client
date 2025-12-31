import { pinata } from "@/lib/pinata";
import { NextRequest, NextResponse } from "next/server";

export interface AccountData {
  name: string;
  bio?: string;
  avatar?: string | null;
  referralCode?: string;
  cid?: string;
}

export interface AccountResponse {
  cid: string;
}

export async function POST(request: NextRequest) {
  const body: AccountData = await request.json();

  // Prepare metadata for IPFS
  const metadata = {
    name: body.name || null,
    bio: body.bio || null,
    avatar: body.avatar || null,
    referralCode: body.referralCode || null,
    timestamp: new Date().toISOString(),
  };

  if (body.cid) {
    // If CID is provided, we are updating existing data
    try {
      await pinata.files.public.delete([body.cid]);
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
