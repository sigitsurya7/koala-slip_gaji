import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { parseSlipWorkbook } from "@/lib/slip-import";

export async function GET() {
  try {
    const root = process.cwd();
    const cand = ["slip_gaji_okt.xlsm", "slip_gaji.xlsx", "slip_gaji_okt.xlsx"]; 
    const file = cand.find((f) => fs.existsSync(path.join(root, f)));
    if (!file) return NextResponse.json({ message: "File contoh tidak ditemukan di root" }, { status: 404 });
    const buf = fs.readFileSync(path.join(root, file));
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    const parsed = await parseSlipWorkbook(ab);
    return NextResponse.json({ from: file, ...parsed });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ message: "Gagal membaca file contoh" }, { status: 500 });
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
