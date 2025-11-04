"use client";

import Link from "next/link";
import { Navbar as HeroUINavbar, NavbarBrand, NavbarContent, NavbarItem } from "@heroui/navbar";
import { Button } from "@heroui/button";
import { MdMenu } from "react-icons/md";

type User = { username: string; role: "Admin" | "Member" } | null;

export function AdminNavbar({ user, loading, onLogout, onOpenSidebar }: {
  user: User;
  loading: boolean;
  onLogout: () => void;
  onOpenSidebar: () => void;
}) {
  return (
    <HeroUINavbar maxWidth="full" position="static" className="rounded-xl shadow border-default-100 bg-content2/70 backdrop-blur">
      <NavbarBrand>
        <button className="md:hidden mr-2" aria-label="Open Menu" onClick={onOpenSidebar}>
          <MdMenu size={22} />
        </button>
        <Link href="/admin" className="font-semibold">Slip Gaji</Link>
      </NavbarBrand>
      <NavbarContent justify="end">
        <NavbarItem>
          <span className="text-sm text-default-500">
            {loading ? "Loading..." : user ? `Welcome, ${user?.username}` : ""}
          </span>
        </NavbarItem>
        <NavbarItem>
          <Button size="sm" variant="flat" onPress={onLogout}>Logout</Button>
        </NavbarItem>
      </NavbarContent>
    </HeroUINavbar>
  );
}
