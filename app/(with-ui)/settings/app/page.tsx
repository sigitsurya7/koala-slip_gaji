"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Input } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { Button } from "@heroui/button";
import { Switch } from "@heroui/switch";
import toast from "react-hot-toast";

type User = { username: string; role: "Admin" | "Member" } | null;

type SettingKey =
  | "DATABASE_URL"
  | "AUTH_SECRET"
  | "SMTP_SERVICE"
  | "SMTP_HOST"
  | "SMTP_PORT"
  | "SMTP_SECURE"
  | "SMTP_USER"
  | "SMTP_PASS"
  | "SMTP_FROM";

type SettingRow = { key: SettingKey; value: string };

export default function SettingsAppPage() {
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testTo, setTestTo] = useState<string>("");
  const [settings, setSettings] = useState<Record<SettingKey, string>>({
    DATABASE_URL: "",
    AUTH_SECRET: "",
    SMTP_SERVICE: "gmail",
    SMTP_HOST: "",
    SMTP_PORT: "465",
    SMTP_SECURE: "true",
    SMTP_USER: "",
    SMTP_PASS: "",
    SMTP_FROM: "",
  });
  const router = useRouter();

  useEffect(() => {
    axios
      .get("/api/me")
      .then((res) => setUser(res.data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!loading && user && user.role !== "Admin") {
      router.replace("/admin");
    }
  }, [loading, user, router]);

  useEffect(() => {
    // load saved settings
    axios
      .get("/api/settings")
      .then((res) => {
        const rows: SettingRow[] = res.data?.settings ?? [];
        const next = { ...settings };
        rows.forEach((r) => {
          if (r.key in next) (next as any)[r.key] = r.value;
        });
        setSettings(next);
        // prefill test recipient from FROM or USER
        const from = rows.find((r)=> r.key === "SMTP_FROM")?.value || rows.find((r)=> r.key === "SMTP_USER")?.value || "";
        const m = from.match(/<([^>]+)>/); setTestTo(m ? m[1] : from);
      })
      .catch(() => {})
      .finally(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <p>Loading...</p>;
  if (!user || user.role !== "Admin") return null;

  const onSave = async () => {
    setSaving(true);
    try {
      await axios.post("/api/settings", settings);
      toast.success("Settings tersimpan");
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };

  const onTest = async () => {
    setTesting(true);
    try {
      await axios.post("/api/settings/test-smtp", {
        to: testTo,
        settings: {
          service: settings.SMTP_SERVICE,
          host: settings.SMTP_HOST,
          port: settings.SMTP_PORT,
          secure: settings.SMTP_SECURE,
          user: settings.SMTP_USER,
          pass: settings.SMTP_PASS,
          from: settings.SMTP_FROM,
        },
      });
      toast.success(`Tes SMTP terkirim ke ${testTo || settings.SMTP_USER}`);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Gagal test SMTP");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Settings · Aplikasi</h2>
        <div className="flex items-center gap-2">
          <Input size="sm" label="Test ke" value={testTo} onValueChange={setTestTo} className="w-56" />
          <Button variant="flat" isLoading={testing} onPress={onTest}>Test SMTP</Button>
          <Button color="primary" isLoading={saving} onPress={onSave}>Simpan</Button>
        </div>
      </div>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4 p-4 rounded-xl border border-default-100 bg-content2/40">
          <h3 className="font-medium">Keamanan</h3>
          <Input
            label="AUTH_SECRET"
            description="JWT secret untuk login"
            type="password"
            value={settings.AUTH_SECRET}
            onValueChange={(v) => setSettings((s) => ({ ...s, AUTH_SECRET: v }))}
          />
        </div>

        <div className="space-y-4 p-4 rounded-xl border border-default-100 bg-content2/40">
          <h3 className="font-medium">Database</h3>
          <Input
            label="DATABASE_URL"
            description="Hanya digunakan untuk display; koneksi tetap dari ENV saat server start"
            value={settings.DATABASE_URL}
            onValueChange={(v) => setSettings((s) => ({ ...s, DATABASE_URL: v }))}
          />
        </div>

        <div className="space-y-4 p-4 rounded-xl border border-default-100 bg-content2/40 md:col-span-2">
          <h3 className="font-medium">SMTP (Email)</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select label="SMTP_SERVICE" selectedKeys={[settings.SMTP_SERVICE || ""]} onChange={(e) => setSettings((s) => ({ ...s, SMTP_SERVICE: e.target.value }))}>
              <SelectItem key="">Manual</SelectItem>
              <SelectItem key="gmail">Gmail</SelectItem>
            </Select>
            <Input label="SMTP_HOST" value={settings.SMTP_HOST} onValueChange={(v)=> setSettings((s)=> ({...s, SMTP_HOST: v}))} />
            <Input label="SMTP_PORT" value={settings.SMTP_PORT} onValueChange={(v)=> setSettings((s)=> ({...s, SMTP_PORT: v}))} />
            <div className="flex items-end"><Switch isSelected={(settings.SMTP_SECURE||"true").toLowerCase()==="true"} onChange={(e)=> setSettings((s)=> ({...s, SMTP_SECURE: String(e.target.checked)}))}>SMTP_SECURE</Switch></div>
            <Input label="SMTP_USER" value={settings.SMTP_USER} onValueChange={(v)=> setSettings((s)=> ({...s, SMTP_USER: v}))} />
            <Input label="SMTP_PASS" type="password" value={settings.SMTP_PASS} onValueChange={(v)=> setSettings((s)=> ({...s, SMTP_PASS: v}))} />
            <Input label="SMTP_FROM" value={settings.SMTP_FROM} onValueChange={(v)=> setSettings((s)=> ({...s, SMTP_FROM: v}))} className="md:col-span-2" />
          </div>
          <p className="text-xs text-default-500 mt-2">Gunakan App Password jika memakai Gmail.</p>
        </div>
      </section>
    </div>
  );
}
