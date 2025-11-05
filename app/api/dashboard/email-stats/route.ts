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

  return NextResponse.json({
    day: { sent: Number(sentDayRow?.c || 0), failed: Number(failDayRow?.c || 0) },
    month: { sent: Number(sentMonRow?.c || 0), failed: Number(failMonRow?.c || 0) },
  });
}

