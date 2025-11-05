import { NextRequest, NextResponse } from "next/server";
import { setSettings, listSettings } from "@/lib/appSettings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await listSettings();
  return NextResponse.json({ settings: rows });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    await setSettings(body || {});
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ message: e?.message || "Failed" }, { status: 500 });
  }
}
