"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

type User = { username: string; role: "Admin" | "Member" } | null;

export default function SettingsAppPage() {
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);
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

  if (loading) return <p>Loading...</p>;
  if (!user || user.role !== "Admin") return null;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Settings · Aplikasi</h2>
      <p className="text-default-500">Pengaturan aplikasi umum.</p>
    </div>
  );
}

