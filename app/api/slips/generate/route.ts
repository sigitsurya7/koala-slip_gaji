import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { generateSlipPDF } from "@/lib/slipPage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function slugify(s: string) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rsName: string = body.rsName || "rs";
    const rsAddress: string = body.rsAddress || "";
    const periode: string = body.periode || "periode";
    const rows: Record<string, any>[] = body.rows || [];
    if (!rows.length) return NextResponse.json({ message: "rows required" }, { status: 400 });

    const root = process.cwd();
    const baseDir = path.join(root, "public", slugify(rsName), slugify(periode));
    fs.mkdirSync(baseDir, { recursive: true });

    // load logo to data URL
    const logoPath = path.join(root, "public", "rs_ananda_group.png");
    const logoDataUrl = fs.existsSync(logoPath)
      ? `data:image/png;base64,${fs.readFileSync(logoPath).toString("base64")}`
      : undefined;

    let saved = 0;
    for (const k of rows) {
      const doc = generateSlipPDF(k, {
        periode,
        hospitalName: rsName,
        hospitalAddress: rsAddress,
        logoDataUrl,
      });
      // Prefer Node buffer if supported
      const arrayBuffer = doc.output("arraybuffer") as ArrayBuffer;
      const buf = new Uint8Array(arrayBuffer);
      const filename = `${(k["NIK"] || "slip").toString()}_${(k["NAMA"] || k["Nama"] || "").toString()}.pdf`.replace(/[^\w\-.]+/g, "_");
      fs.writeFileSync(path.join(baseDir, filename), buf);
      saved++;
    }

    return NextResponse.json({ ok: true, saved, dir: baseDir.replace(root, "") });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ message: e?.message || "Failed" }, { status: 500 });
  }
}
