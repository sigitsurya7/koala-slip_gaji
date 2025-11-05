"use client";

import { useEffect, useState } from "react";
import axios from "axios";

type User = { username: string; role: "Admin" | "Member" } | null;

type Stats = { day: { sent: number; failed: number }; month: { sent: number; failed: number } };

function Card({ title, value, hint, color }: { title: string; value: number; hint?: string; color?: string }) {
  return (
    <div className={`p-4 rounded-2xl border border-default-100 bg-content2/50 shadow-medium ${color || ''}`}>
      <div className="text-xs text-default-500 mb-1">{title}</div>
      <div className="text-3xl font-semibold">{value}</div>
      {hint && <div className="text-xs text-default-500 mt-1">{hint}</div>}
    </div>
  );
}

export default function AdminDashboard() {
  const [user, setUser] = useState<User>(null);
  const [stats, setStats] = useState<Stats>({ day: { sent: 0, failed: 0 }, month: { sent: 0, failed: 0 } });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get("/api/me").then((res) => setUser(res.data.user)).catch(() => setUser(null));
  }, []);

  const loadStats = async () => {
    try {
      const res = await axios.get("/api/dashboard/email-stats");
      setStats(res.data);
    } catch {}
  };

  useEffect(() => {
    loadStats().finally(() => setLoading(false));
    const id = setInterval(loadStats, 30000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Dashboard</h2>
        {user && <p className="text-default-500">Selamat datang, {user.username}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card title="Email Terkirim (Hari Ini)" value={stats.day.sent} />
        <Card title="Email Gagal (Hari Ini)" value={stats.day.failed} />
        <Card title="Email Terkirim (Bulan Ini)" value={stats.month.sent} />
        <Card title="Email Gagal (Bulan Ini)" value={stats.month.failed} />
      </div>

      {loading && <p className="text-default-500">Memuat statistik...</p>}
    </div>
  );
}
