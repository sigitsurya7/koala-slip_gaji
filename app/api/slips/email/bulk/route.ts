import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";
import path from "path";
import fs from "fs";
import { getSMTPSettings } from "@/lib/appSettings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function required(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

function slugify(s: string) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rsName: string = body.rsName || "rs";
    const periode: string = body.periode || "periode";
    const recipients: { email: string; filename: string; name?: string }[] = body.recipients || [];
    if (!recipients.length) return NextResponse.json({ message: "recipients required" }, { status: 400 });

    const root = process.cwd();
    const baseDir = path.join(root, "public", slugify(rsName), slugify(periode));

    const cfg = await getSMTPSettings();
    const service = cfg.service;
    const host = cfg.host;
    const port = cfg.port;
    const secure = cfg.secure;
    const user = cfg.user || required("SMTP_USER");
    const pass = cfg.pass || required("SMTP_PASS");
    const from = cfg.from || `HRD ANANDA || SLIP GAJI <${user}>`;

    const transporter = service === "gmail"
      ? nodemailer.createTransport({ service: "gmail", auth: { user, pass }, pool: true })
      : nodemailer.createTransport({ host, port, secure, auth: { user, pass }, pool: true, requireTLS: !secure, tls: { minVersion: "TLSv1.2" } });

    let sent = 0; let skipped = 0; const failed: { email: string; error: string }[] = [];
    const already: string[] = [];

    for (const r of recipients) {
      const email = r.email;
      const filePath = path.join(baseDir, r.filename.replace(/[^\w\-.]+/g, "_"));
      if (!fs.existsSync(filePath)) { failed.push({ email, error: "attachment not found" }); continue; }

      const nama = r.name || r.filename.split("_")[1]?.replace(/\.pdf$/i, "") || "Karyawan";
      const subject = `Slip gaji bulan ${periode} - ${nama}`;
      const text = `Assalamualaikum warahmatullahi wabarakatuh, ${nama}, berikut ini adalah slip gaji untuk bulan ${periode}\n\nterimakasih ( HRD RS ANANDA GROUP )`;

      try {
        // Skip if already sent in DB for same periode + email
        let exists = false;
        const anyPrisma = prisma as any;
        if (anyPrisma?.emailLog) {
          const exist = await anyPrisma.emailLog.findFirst({ where: { periode, email } });
          exists = Boolean(exist);
        } else {
          const rows = (await prisma.$queryRawUnsafe<any[]>(
            "SELECT 1 FROM EmailLog WHERE periode = ? AND email = ? LIMIT 1",
            periode,
            email,
          )) as any[];
          exists = Boolean(rows?.length);
        }
        if (exists) { skipped++; already.push(email); continue; }

        await transporter.sendMail({ from, to: email, subject, text, attachments: [{ filename: path.basename(filePath), path: filePath, contentType: "application/pdf" }] });
        sent++;
        if (anyPrisma?.emailLog) {
          await anyPrisma.emailLog.create({ data: { periode, email, name: nama, rsName } });
        } else {
          await prisma.$executeRawUnsafe(
            "INSERT INTO EmailLog (email, periode, nik, name, rsName, createdAt) VALUES (?, ?, NULL, ?, ?, CURRENT_TIMESTAMP)",
            email,
            periode,
            nama,
            rsName,
          );
        }
      } catch (e: any) {
        const errMsg = e?.message || "unknown";
        failed.push({ email, error: errMsg });
        // log failure
        const anyPrisma = prisma as any;
        try {
          if (anyPrisma?.emailFailLog) {
            await anyPrisma.emailFailLog.create({ data: { periode, email, name: nama, rsName, error: errMsg } });
          } else {
            await prisma.$executeRawUnsafe(
              "INSERT INTO EmailFailLog (email, periode, name, rsName, error, createdAt) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)",
              email,
              periode,
              nama,
              rsName,
              errMsg,
            );
          }
        } catch {}
      }
    }

    return NextResponse.json({ ok: true, sent, skipped, failed, already, dir: baseDir.replace(root, "") });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ message: e?.message || "Failed" }, { status: 500 });
  }
}
