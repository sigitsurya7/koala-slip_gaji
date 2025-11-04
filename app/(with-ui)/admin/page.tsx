"use client";

import { useEffect, useState } from "react";
import axios from "axios";

type User = { username: string; role: "Admin" | "Member" } | null;

export default function AdminDashboard() {
  const [user, setUser] = useState<User>(null);

  useEffect(() => {
    axios.get("/api/me").then((res) => setUser(res.data.user)).catch(() => setUser(null));
  }, []);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Dashboard</h2>
      <p className="text-default-500">Selamat datang di dashboard.</p>
      {user && (
        <div className="text-sm text-default-600">Welcome, {user.username}</div>
      )}
    </div>
  );
}

