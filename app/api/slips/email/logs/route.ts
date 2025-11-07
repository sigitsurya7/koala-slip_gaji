import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const periode = searchParams.get("periode") ?? undefined;
    const email = searchParams.get("email") ?? undefined;
    const anyPrisma = prisma as any;
    let logs: any[] = [];
    if (anyPrisma?.emailLog?.findMany) {
      const where: any = {};
      if (periode) where.periode = periode;
      if (email) where.email = email;
      logs = await anyPrisma.emailLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 500,
        select: { id: true, email: true, name: true, rsName: true, periode: true, createdAt: true },
      });
    } else {
      // Fallback raw SQL when Prisma Client hasn't regenerated
      let sql = "SELECT id, email, name, rsName, periode, createdAt FROM EmailLog WHERE 1=1";
      const params: any[] = [];
      if (periode) { sql += " AND periode = ?"; params.push(periode); }
      if (email) { sql += " AND email = ?"; params.push(email); }
      sql += " ORDER BY createdAt DESC LIMIT 500";
      logs = (await prisma.$queryRawUnsafe<any[]>(sql, ...params)) ?? [];
    }
    return NextResponse.json({ logs });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ message: e?.message || "Failed" }, { status: 500 });
  }
}
