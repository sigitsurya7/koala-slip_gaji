import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { getSMTPSettings } from "@/lib/appSettings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Cfg = {
  service?: string;
  host?: string;
  port?: number | string;
  secure?: boolean | string;
  user?: string;
  pass?: string;
  from?: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const to: string = body?.to;
    const overrides: Cfg | undefined = body?.settings;

    // Load current settings from DB (with ENV fallback) then apply overrides from request (if any)
    const cfgDb = await getSMTPSettings();
    const cfg: Cfg = {
      service: overrides?.service ?? cfgDb.service,
      host: overrides?.host ?? cfgDb.host,
      port: overrides?.port ?? cfgDb.port,
      secure: typeof overrides?.secure !== "undefined" ? String(overrides.secure).toLowerCase() === "true" : cfgDb.secure,
      user: overrides?.user ?? cfgDb.user,
      pass: overrides?.pass ?? cfgDb.pass,
      from: overrides?.from ?? cfgDb.from ?? (cfgDb.user ? `HRD ANANDA || SLIP GAJI <${cfgDb.user}>` : undefined),
    };

    if (!cfg.user || !cfg.pass) return NextResponse.json({ ok: false, message: "SMTP_USER/SMTP_PASS belum diisi" }, { status: 400 });
    const recipient = to || cfg.user;

    const transporter = (cfg.service === "gmail")
      ? nodemailer.createTransport({ service: "gmail", auth: { user: cfg.user, pass: cfg.pass }, pool: true })
      : nodemailer.createTransport({
          host: cfg.host || "smtp.gmail.com",
          port: Number(cfg.port || 465),
          secure: Number(cfg.port || 465) === 465 || Boolean(cfg.secure),
          auth: { user: cfg.user, pass: cfg.pass },
          pool: true,
          requireTLS: Number(cfg.port || 465) !== 465,
          tls: { minVersion: "TLSv1.2" },
        });

    const info = await transporter.sendMail({
      from: cfg.from || cfg.user,
      to: recipient,
      subject: "Test SMTP - Koala Slip Gaji",
      text: `Tes pengiriman SMTP berhasil. Waktu: ${new Date().toLocaleString("id-ID")}`,
    });

    return NextResponse.json({ ok: true, messageId: info.messageId, to: recipient });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ ok: false, message: e?.message || "Gagal test SMTP" }, { status: 500 });
  }
}

