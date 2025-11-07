"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Input } from "@heroui/input";
import { Pagination } from "@heroui/pagination";

type User = { username: string; role: "Admin" | "Member" } | null;

type DayMonth = { sent: number; failed: number };
type Stats = {
  day: DayMonth;
  month: DayMonth;
  byRs?: { rsName: string; sent: number }[];
  topPeriods?: { periode: string; sent: number }[];
  lastSent?: { email: string; name?: string; rsName?: string; periode?: string; createdAt: string }[];
  lastFailed?: { email: string; name?: string; rsName?: string; periode?: string; error?: string; createdAt: string }[];
  last7Days?: { day: string; sent: number; failed: number }[];
};

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
  const [sentQuery, setSentQuery] = useState("");
  const [failedQuery, setFailedQuery] = useState("");
  const [sentPage, setSentPage] = useState(1);
  const [failedPage, setFailedPage] = useState(1);
  const sentPerPage = 10;
  const failedPerPage = 10;

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

  const max7 = useMemo(() => {
    const arr = stats.last7Days || [];
    return Math.max(1, ...arr.map((d) => d.sent + d.failed));
  }, [stats.last7Days]);

  function fmtTime(s: string) {
    const d = new Date(s);
    const tanggal = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const jam = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });
    return `${tanggal}, ${jam}`;
  }

  // Filter & paginate sent
  const filteredSent = useMemo(() => {
    const q = sentQuery.toLowerCase();
    const arr = stats.lastSent || [];
    if (!q) return arr;
    return arr.filter((l) =>
      (l.email || '').toLowerCase().includes(q) ||
      (l.name || '').toLowerCase().includes(q) ||
      (l.rsName || '').toLowerCase().includes(q) ||
      (l.periode || '').toLowerCase().includes(q)
    );
  }, [stats.lastSent, sentQuery]);
  const sentTotalPages = Math.max(1, Math.ceil(filteredSent.length / sentPerPage));
  const currentSent = useMemo(() => {
    const start = (sentPage - 1) * sentPerPage;
    return filteredSent.slice(start, start + sentPerPage);
  }, [filteredSent, sentPage]);
  useEffect(() => { setSentPage(1); }, [sentQuery]);

  // Filter & paginate failed
  const filteredFailed = useMemo(() => {
    const q = failedQuery.toLowerCase();
    const arr = stats.lastFailed || [];
    if (!q) return arr;
    return arr.filter((l) =>
      (l.email || '').toLowerCase().includes(q) ||
      (l.name || '').toLowerCase().includes(q) ||
      (l.rsName || '').toLowerCase().includes(q) ||
      (l.periode || '').toLowerCase().includes(q) ||
      ((l as any).error || '').toLowerCase().includes(q)
    );
  }, [stats.lastFailed, failedQuery]);
  const failedTotalPages = Math.max(1, Math.ceil(filteredFailed.length / failedPerPage));
  const currentFailed = useMemo(() => {
    const start = (failedPage - 1) * failedPerPage;
    return filteredFailed.slice(start, start + failedPerPage);
  }, [filteredFailed, failedPage]);
  useEffect(() => { setFailedPage(1); }, [failedQuery]);

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

      {/* Tren 7 Hari */}
      <div className="p-4 rounded-2xl border border-default-100 bg-content2/50 shadow-medium">
        <div className="text-xs text-default-500 mb-3">Tren 7 Hari (Terkirim & Gagal)</div>
        <div className="flex items-end gap-2 h-24">
          {(stats.last7Days || []).map((d) => {
            const total = d.sent + d.failed;
            const h = Math.max(4, Math.round((total / max7) * 90));
            return (
              <div key={d.day} className="flex flex-col items-center gap-1 w-10">
                <div className="w-full bg-default-200 rounded overflow-hidden" style={{ height: `${h}px` }}>
                  <div className="bg-success-500" style={{ height: `${Math.max(0, Math.round((d.sent / Math.max(1, total)) * 100))}%` }} />
                </div>
                <div className="text-[10px] text-default-500">{new Date(d.day).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' })}</div>
              </div>
            );
          })}
        </div>
        <div className="text-xs text-default-500 mt-2">Hijau: terkirim, abu: total (termasuk gagal)</div>
      </div>

      {/* Per RS & Top Periode */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="p-4 rounded-2xl border border-default-100 bg-content2/50 shadow-medium">
          <div className="text-xs text-default-500 mb-2">Per RS (Bulan Ini)</div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-default-100">
                  <th className="text-left px-3 py-2">Rumah Sakit</th>
                  <th className="text-right px-3 py-2">Terkirim</th>
                </tr>
              </thead>
              <tbody>
                {(stats.byRs || []).map((r, i) => (
                  <tr key={`${r.rsName}-${i}`} className="border-b border-default-100">
                    <td className="px-3 py-2">{r.rsName}</td>
                    <td className="px-3 py-2 text-right">{r.sent}</td>
                  </tr>
                ))}
                {(!stats.byRs || stats.byRs.length === 0) && (
                  <tr><td colSpan={2} className="px-3 py-2 text-default-500">Belum ada data</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="p-4 rounded-2xl border border-default-100 bg-content2/50 shadow-medium">
          <div className="text-xs text-default-500 mb-2">Top Periode (Bulan Ini)</div>
          <ul className="space-y-1">
            {(stats.topPeriods || []).map((p, i) => (
              <li key={`${p.periode}-${i}`} className="flex items-center justify-between text-sm">
                <span>{p.periode || '-'}</span>
                <span className="text-default-700">{p.sent}</span>
              </li>
            ))}
            {(!stats.topPeriods || stats.topPeriods.length === 0) && (
              <li className="text-default-500 text-sm">Belum ada data</li>
            )}
          </ul>
        </div>
      </div>

      {/* Aktivitas Terkini & Gagal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="p-4 rounded-2xl border border-default-100 bg-content2/50 shadow-medium">
          <div className="flex items-end justify-between gap-3 mb-2">
            <div className="text-xs text-default-500">Aktivitas Terkini</div>
            <div className="flex items-end gap-2">
              <Input size="sm" placeholder="Cari email/nama/RS/periode" value={sentQuery} onValueChange={setSentQuery} className="max-w-xs" />
            </div>
          </div>
          <div className="space-y-2 text-sm">
            {currentSent.map((l, i) => (
              <div key={`${l.email}-${i}`} className="flex items-center justify-between border-b border-default-100 pb-2">
                <div className="flex flex-col">
                  <span className="font-medium">{l.name || l.email}</span>
                  <span className="text-xs text-default-500">{l.email} • {l.rsName || '-'} • {l.periode || '-'}</span>
                </div>
                <div className="text-xs text-default-500">{fmtTime(l.createdAt)}</div>
              </div>
            ))}
            {(!filteredSent || filteredSent.length === 0) && (
              <div className="text-default-500 text-sm">Belum ada aktivitas</div>
            )}
          </div>
          <div className="flex items-center justify-between mt-3">
            <div className="text-xs text-default-500">Total: {filteredSent.length}</div>
            <Pagination page={sentPage} total={sentTotalPages} onChange={setSentPage} showControls size="sm" />
          </div>
        </div>
        <div className="p-4 rounded-2xl border border-default-100 bg-content2/50 shadow-medium">
          <div className="flex items-end justify-between gap-3 mb-2">
            <div className="text-xs text-default-500">Gagal Terkini</div>
            <div className="flex items-end gap-2">
              <Input size="sm" placeholder="Cari email/nama/RS/periode/error" value={failedQuery} onValueChange={setFailedQuery} className="max-w-xs" />
            </div>
          </div>
          <div className="space-y-2 text-sm">
            {currentFailed.map((l, i) => (
              <div key={`${l.email}-${i}`} className="flex items-center justify-between border-b border-default-100 pb-2">
                <div className="flex flex-col">
                  <span className="font-medium">{l.email}</span>
                  <span className="text-xs text-danger-500">{((l as any).error || '').slice(0, 80) || 'Gagal tanpa pesan'}</span>
                  <span className="text-xs text-default-500">{l.rsName || '-'} • {l.periode || '-'}</span>
                </div>
                <div className="text-xs text-default-500">{fmtTime(l.createdAt)}</div>
              </div>
            ))}
            {(!filteredFailed || filteredFailed.length === 0) && (
              <div className="text-default-500 text-sm">Tidak ada kegagalan terkini</div>
            )}
          </div>
          <div className="flex items-center justify-between mt-3">
            <div className="text-xs text-default-500">Total: {filteredFailed.length}</div>
            <Pagination page={failedPage} total={failedTotalPages} onChange={setFailedPage} showControls size="sm" />
          </div>
        </div>
      </div>
    </div>
  );
}
