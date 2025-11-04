import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import path from "path";
import fs from "fs";

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

    const service = (process.env.SMTP_SERVICE || "").toLowerCase();
    const host = process.env.SMTP_HOST || "smtp.gmail.com";
    const port = Number(process.env.SMTP_PORT || 465);
    const secure = port === 465 || (process.env.SMTP_SECURE || "").toLowerCase() === "true";
    const user = required("SMTP_USER");
    const pass = required("SMTP_PASS");
    const from = process.env.SMTP_FROM || `HRD ANANDA || SLIP GAJI <${user}>`;

    const transporter = service === "gmail"
      ? nodemailer.createTransport({ service: "gmail", auth: { user, pass }, pool: true })
      : nodemailer.createTransport({ host, port, secure, auth: { user, pass }, pool: true, requireTLS: !secure, tls: { minVersion: "TLSv1.2" } });

    let sent = 0; let skipped = 0; const failed: { email: string; error: string }[] = [];

    for (const r of recipients) {
      const email = r.email;
      const filePath = path.join(baseDir, r.filename.replace(/[^\w\-.]+/g, "_"));
      if (!fs.existsSync(filePath)) { failed.push({ email, error: "attachment not found" }); continue; }

      const nama = r.name || r.filename.split("_")[1]?.replace(/\.pdf$/i, "") || "Karyawan";
      const subject = `Slip gaji bulan ${periode} - ${nama}`;
      const text = `Assalamualaikum warahmatullahi wabarakatuh, ${nama}, berikut ini adalah slip gaji untuk bulan ${periode}\n\nterimakasih ( HRD RS ANANDA GROUP )`;

      try {
        await transporter.sendMail({ from, to: email, subject, text, attachments: [{ filename: path.basename(filePath), path: filePath, contentType: "application/pdf" }] });
        sent++;
      } catch (e: any) {
        failed.push({ email, error: e?.message || "unknown" });
      }
    }

    return NextResponse.json({ ok: true, sent, skipped, failed, dir: baseDir.replace(root, "") });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ message: e?.message || "Failed" }, { status: 500 });
  }
}

