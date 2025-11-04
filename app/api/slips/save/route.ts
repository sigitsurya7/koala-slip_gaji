import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rsName = String(body.rsName || "rs");
    const periode = String(body.periode || "periode");
    const files: { filename: string; dataUrl: string }[] = body.files || [];
    if (!files.length) return NextResponse.json({ message: "No files" }, { status: 400 });

    const baseDir = path.join(process.cwd(), "public", slugify(rsName), slugify(periode));
    fs.mkdirSync(baseDir, { recursive: true });

    let saved = 0;
    for (const f of files) {
      const { filename, dataUrl } = f;
      const m = String(dataUrl).match(/^data:application\/pdf;base64,(.+)$/);
      const base64 = m ? m[1] : String(dataUrl).split(",")[1];
      if (!base64) continue;
      const buf = Buffer.from(base64, "base64");
      const filePath = path.join(baseDir, filename.replace(/[^\w\-.]+/g, "_"));
      fs.writeFileSync(filePath, new Uint8Array(buf));
      saved++;
    }

    return NextResponse.json({ ok: true, saved, dir: baseDir.replace(process.cwd(), "") });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ message: "Failed to save" }, { status: 500 });
  }
}
