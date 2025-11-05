import { prisma } from "@/lib/prisma";

export type SettingKey =
  | "DATABASE_URL"
  | "AUTH_SECRET"
  | "SMTP_SERVICE"
  | "SMTP_HOST"
  | "SMTP_PORT"
  | "SMTP_SECURE"
  | "SMTP_USER"
  | "SMTP_PASS"
  | "SMTP_FROM";

const cache = new Map<string, string>();

function hasModel(modelName: string): boolean {
  const anyPrisma = prisma as any;
  return Boolean(anyPrisma?.[modelName]);
}

export async function getSetting(key: SettingKey): Promise<string | undefined> {
  if (cache.has(key)) return cache.get(key);
  let val: string | undefined;
  if (hasModel("appSetting")) {
    const rec = await (prisma as any).appSetting.findUnique({ where: { key } });
    val = rec?.value;
  } else {
    try {
      const rows = (await prisma.$queryRawUnsafe<any[]>(
        "SELECT value FROM AppSetting WHERE key = ? LIMIT 1",
        key,
      )) as any[];
      val = rows?.[0]?.value;
    } catch {}
  }
  if (val) cache.set(key, val);
  return val ?? process.env[key as any];
}

export async function getSMTPSettings() {
  const [service, host, port, secure, user, pass, from] = await Promise.all([
    getSetting("SMTP_SERVICE"),
    getSetting("SMTP_HOST"),
    getSetting("SMTP_PORT"),
    getSetting("SMTP_SECURE"),
    getSetting("SMTP_USER"),
    getSetting("SMTP_PASS"),
    getSetting("SMTP_FROM"),
  ]);
  return {
    service: (service || "").toLowerCase(),
    host: host || "smtp.gmail.com",
    port: Number(port || 465),
    secure: (port || "465") === "465" || (secure || "").toLowerCase() === "true",
    user: user,
    pass: pass,
    from: from || (user ? `HRD ANANDA || SLIP GAJI <${user}>` : undefined),
  };
}

export async function setSettings(values: Partial<Record<SettingKey, string>>) {
  for (const [key, value] of Object.entries(values)) {
    if (!value) continue;
    if (hasModel("appSetting")) {
      await (prisma as any).appSetting.upsert({ where: { key }, update: { value }, create: { key, value } });
    } else {
      // SQLite upsert
      await prisma.$executeRawUnsafe(
        "INSERT INTO AppSetting (key, value, createdAt, updatedAt) VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)\n         ON CONFLICT(key) DO UPDATE SET value=excluded.value, updatedAt=CURRENT_TIMESTAMP",
        key,
        value,
      );
    }
    cache.set(key, value);
  }
}

export async function listSettings(): Promise<{ key: string; value: string }[]> {
  if (hasModel("appSetting")) {
    return (await (prisma as any).appSetting.findMany({ orderBy: { key: "asc" } })) as any[];
  }
  try {
    const rows = (await prisma.$queryRawUnsafe<any[]>("SELECT key, value FROM AppSetting ORDER BY key ASC")) as any[];
    return rows ?? [];
  } catch {
    return [];
  }
}
