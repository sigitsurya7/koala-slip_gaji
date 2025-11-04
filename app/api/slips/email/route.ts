import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function required(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const to: string | string[] = body.to;
    const files: { filename: string; dataUrl: string }[] = body.files || [];
    const row: Record<string, any> | undefined = body.row;
    const periode: string = body.periode || row?.Periode || row?.periode || "";
    const nama: string =
      body.name ||
      row?.NAMA ||
      row?.Nama ||
      row?.["Nama Karyawan"] ||
      row?.nama_karyawan ||
      "Karyawan";
    const subject: string = `Slip gaji bulan ${periode} - ${nama}`;
    const text: string = `Assalamualaikum warahmatullahi wabarakatuh, ${nama}, berikut ini adalah slip gaji untuk bulan ${periode}\n\nterimakasih ( HRD RS ANANDA GROUP )`;
    const html: string | undefined = body.html; // optional rich format
    if (!to) return NextResponse.json({ message: "Field 'to' is required" }, { status: 400 });

    const service = (process.env.SMTP_SERVICE || "").toLowerCase();
    const host = process.env.SMTP_HOST || "smtp.gmail.com";
    const port = Number(process.env.SMTP_PORT || 465);
    const secure = port === 465 || (process.env.SMTP_SECURE || "").toLowerCase() === "true";
    const user = required("SMTP_USER");
    const pass = required("SMTP_PASS");
    const from = process.env.SMTP_FROM || `HRD ANANDA || SLIP GAJI <${user}>`;

    const transporter = service === "gmail"
      ? nodemailer.createTransport({
          service: "gmail",
          auth: { user, pass },
          pool: true,
        })
      : nodemailer.createTransport({
          host,
          port,
          secure,
          auth: { user, pass },
          pool: true,
          requireTLS: !secure,
          tls: { minVersion: "TLSv1.2" },
        });

    const attachments = files.map((f) => {
      const base64 = String(f.dataUrl).split(",")[1];
      return {
        filename: f.filename,
        content: Buffer.from(base64, "base64"),
        contentType: "application/pdf",
      } as any;
    });

    const info = await transporter.sendMail({
      from,
      to,
      subject,
      text,
      html,
      attachments,
    });

    return NextResponse.json({ ok: true, messageId: info.messageId });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ message: e?.message || "Failed to send" }, { status: 500 });
  }
}
