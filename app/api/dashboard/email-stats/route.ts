import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function startOfDay(d = new Date()) {
  const x = new Date(d); x.setHours(0,0,0,0); return x;
}
function startOfTomorrow(d = new Date()) {
  const x = startOfDay(d); x.setDate(x.getDate()+1); return x;
}
function startOfMonth(d = new Date()) {
  const x = new Date(d.getFullYear(), d.getMonth(), 1); return x;
}
function startOfNextMonth(d = new Date()) {
  const x = new Date(d.getFullYear(), d.getMonth()+1, 1); return x;
}

export async function GET() {
  const sDay = startOfDay();
  const eDay = startOfTomorrow();
  const sMon = startOfMonth();
  const eMon = startOfNextMonth();

  // raw SQL fallback-friendly counts
  const [sentDayRow] = (await prisma.$queryRawUnsafe<any[]>(
    "SELECT COUNT(*) as c FROM EmailLog WHERE createdAt >= ? AND createdAt < ?",
    sDay.toISOString(), eDay.toISOString()
  )) as any[];
  const [failDayRow] = (await prisma.$queryRawUnsafe<any[]>(
    "SELECT COUNT(*) as c FROM EmailFailLog WHERE createdAt >= ? AND createdAt < ?",
    sDay.toISOString(), eDay.toISOString()
  )) as any[];
  const [sentMonRow] = (await prisma.$queryRawUnsafe<any[]>(
    "SELECT COUNT(*) as c FROM EmailLog WHERE createdAt >= ? AND createdAt < ?",
    sMon.toISOString(), eMon.toISOString()
  )) as any[];
  const [failMonRow] = (await prisma.$queryRawUnsafe<any[]>(
    "SELECT COUNT(*) as c FROM EmailFailLog WHERE createdAt >= ? AND createdAt < ?",
    sMon.toISOString(), eMon.toISOString()
  )) as any[];

  // Per RS (bulan ini)
  const byRs = (await prisma.$queryRawUnsafe<any[]>(
    "SELECT COALESCE(rsName, '(Tanpa RS)') as rsName, COUNT(*) as sent FROM EmailLog WHERE createdAt >= ? AND createdAt < ? GROUP BY COALESCE(rsName, '(Tanpa RS)') ORDER BY sent DESC LIMIT 10",
    sMon.toISOString(), eMon.toISOString()
  )) as any[];

  // Top Periode (bulan ini)
  const topPeriods = (await prisma.$queryRawUnsafe<any[]>(
    "SELECT periode, COUNT(*) as sent FROM EmailLog WHERE createdAt >= ? AND createdAt < ? GROUP BY periode ORDER BY sent DESC LIMIT 10",
    sMon.toISOString(), eMon.toISOString()
  )) as any[];

  // Last 10 sent and failed
  const lastSent = (await prisma.$queryRawUnsafe<any[]>(
    "SELECT email, name, rsName, periode, createdAt FROM EmailLog ORDER BY createdAt DESC LIMIT 200"
  )) as any[];
  const lastFailed = (await prisma.$queryRawUnsafe<any[]>(
    "SELECT email, name, rsName, periode, error, createdAt FROM EmailFailLog ORDER BY createdAt DESC LIMIT 200"
  )) as any[];

  // 7-day trend (based on substr of ISO timestamp date part)
  const start7 = new Date(startOfDay());
  start7.setDate(start7.getDate() - 6);
  function toDayKey(d: Date) {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  }
  const [sent7Rows, fail7Rows] = await Promise.all([
    prisma.$queryRawUnsafe<any[]>(
      "SELECT substr(createdAt,1,10) as d, COUNT(*) as c FROM EmailLog WHERE createdAt >= ? GROUP BY substr(createdAt,1,10) ORDER BY d",
      start7.toISOString()
    ),
    prisma.$queryRawUnsafe<any[]>(
      "SELECT substr(createdAt,1,10) as d, COUNT(*) as c FROM EmailFailLog WHERE createdAt >= ? GROUP BY substr(createdAt,1,10) ORDER BY d",
      start7.toISOString()
    ),
  ]);
  const sentMap = new Map<string, number>(sent7Rows.map((r: any) => [String(r.d), Number(r.c)]));
  const failMap = new Map<string, number>(fail7Rows.map((r: any) => [String(r.d), Number(r.c)]));
  const days: { day: string; sent: number; failed: number }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start7);
    d.setDate(start7.getDate() + i);
    const key = toDayKey(d);
    days.push({ day: key, sent: sentMap.get(key) || 0, failed: failMap.get(key) || 0 });
  }

  return NextResponse.json({
    day: { sent: Number(sentDayRow?.c || 0), failed: Number(failDayRow?.c || 0) },
    month: { sent: Number(sentMonRow?.c || 0), failed: Number(failMonRow?.c || 0) },
    byRs: byRs.map((r) => ({ rsName: r.rsName || '(Tanpa RS)', sent: Number(r.sent || 0) })),
    topPeriods: topPeriods.map((r) => ({ periode: r.periode || '-', sent: Number(r.sent || 0) })),
    lastSent,
    lastFailed,
    last7Days: days,
  });
}
