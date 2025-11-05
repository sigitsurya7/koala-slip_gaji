import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const periode = searchParams.get("periode") ?? undefined;
    const email = searchParams.get("email") ?? undefined;
    const where: any = {};
    if (periode) where.periode = periode;
    if (email) where.email = email;
    const logs = await prisma.emailLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 500,
      select: { id: true, email: true, name: true, rsName: true, periode: true, createdAt: true },
    });
    return NextResponse.json({ logs });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ message: e?.message || "Failed" }, { status: 500 });
  }
}

