"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import toast from "react-hot-toast";
import { Input } from "@heroui/input";
import { Button } from "@heroui/button";
import { Card } from "@heroui/card";

function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next") ?? "/admin";

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const p = axios.post("/api/login", { username, password });
    setLoading(true);
    await toast.promise(p, {
      loading: "Signing in...",
      success: () => {
        router.push(next);
        return "Welcome!";
      },
      error: (err) => err?.response?.data?.message ?? "Login failed",
    });
    setLoading(false);
  };

  return (
    <section className="min-h-screen w-full flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="p-6 w-full">
          <h1 className="text-2xl font-semibold mb-6 text-center">Masuk</h1>
          <form className="flex flex-col gap-4" onSubmit={onSubmit}>
            <Input
              isRequired
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
            />
            <Input
              isRequired
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button color="primary" type="submit" isLoading={loading} fullWidth>
              Login
            </Button>
          </form>
        </Card>
      </div>
    </section>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="text-center p-6">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
