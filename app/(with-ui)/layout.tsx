"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import axios from "axios";
import toast from "react-hot-toast";
import { AdminNavbar } from "./_components/navbar";
import { AdminSidebar } from "./_components/sidebar";
import { AdminContent } from "./_components/content";

type User = { username: string; role: "Admin" | "Member" } | null;

export default function WithUILayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    axios
      .get("/api/me")
      .then((res) => setUser(res.data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  // Tutup drawer mobile saat route berubah
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const logout = async () => {
    await toast.promise(axios.post("/api/logout"), {
      loading: "Logging out...",
      success: "Logged out",
      error: "Failed to logout",
    });
    router.push("/login");
  };

  return (
    <div className="flex h-dvh w-full bg-background text-foreground font-sans overflow-hidden">
      {/* Sidebar (desktop) */}
      <aside className="hidden md:block">
        <AdminSidebar user={user} pathname={pathname} />
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Navbar */}
        <div className="sticky top-0 z-40 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-4">
          <div className="px-4 sm:px-6 lg:px-8">
            <AdminNavbar user={user} loading={loading} onLogout={logout} onOpenSidebar={() => setSidebarOpen(true)} />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0">
          <AdminContent>{children}</AdminContent>
        </div>
      </div>

      {/* Sidebar (mobile) - custom drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0" onClick={() => setSidebarOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[80vw]">
            <AdminSidebar user={user} pathname={pathname} fullWidth onNavigate={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
 
