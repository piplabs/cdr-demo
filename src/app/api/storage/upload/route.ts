import { NextResponse } from "next/server";
import { encryptFile } from "@piplabs/cdr-crypto";
import { toHex } from "viem";
import { getStorachaClient } from "@/lib/storacha";

const uploadCounts = new Map<string, number>();
const MAX_UPLOADS = 5;
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const address = formData.get("address") as string | null;

  if (!file || !address) {
    return NextResponse.json(
      { error: "file and address are required" },
      { status: 400 }
    );
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "File too large. Maximum 10MB" },
      { status: 413 }
    );
  }

  const normalized = address.toLowerCase();
  const count = uploadCounts.get(normalized) ?? 0;
  if (count >= MAX_UPLOADS) {
    return NextResponse.json(
      { error: "Upload limit reached (5 files per address)" },
      { status: 429 }
    );
  }

  try {
    const content = new Uint8Array(await file.arrayBuffer());
    const { ciphertext, key } = encryptFile(content);
    const storacha = await getStorachaClient();
    const blob = new Blob([ciphertext as BlobPart]);
    const cid = await storacha.uploadFile(blob);
    uploadCounts.set(normalized, count + 1);

    return NextResponse.json({
      cid: cid.toString(),
      encryptionKey: toHex(key),
      fileName: file.name,
      fileSize: file.size,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 500 }
    );
  }
}
