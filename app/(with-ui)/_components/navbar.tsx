"use client";

import Link from "next/link";
import { Navbar as HeroUINavbar, NavbarBrand, NavbarContent, NavbarItem } from "@heroui/navbar";
import {Dropdown, DropdownTrigger, DropdownMenu, DropdownItem} from "@heroui/dropdown";
import { Avatar } from "@heroui/avatar";
import { User } from "@heroui/user";
import { Button } from "@heroui/button";
import { MdMenu } from "react-icons/md";
import { ThemeSwitch } from "@/components/theme-switch";

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
          <ThemeSwitch />
        </NavbarItem>
        <NavbarItem>
          {loading ?
            <></>
            :
            <Dropdown placement="bottom-start">
              <DropdownTrigger>
                <User
                  as="button"
                  avatarProps={{
                    isBordered: true,
                    src: "https://api.dicebear.com/9.x/avataaars/svg?seed="+ (user ? user?.username : ""),
                  }}
                  className="transition-transform cursor-pointer"
                  description={user ? "@" + user.role : ""}
                  name={user ? user?.username : ""}
                />
              </DropdownTrigger>
              <DropdownMenu aria-label="User Actions" variant="flat">
                <DropdownItem key="profile" className="h-14 gap-2">
                  <p className="font-bold">Signed in as</p>
                  <p className="font-bold">{user?.username}</p>
                </DropdownItem>
                <DropdownItem key="settings">My Settings</DropdownItem>
                <DropdownItem key="logout" className="text-danger" color="danger" onPress={onLogout}>
                  Log Out
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          }

        </NavbarItem>
      </NavbarContent>
    </HeroUINavbar>
  );
}
