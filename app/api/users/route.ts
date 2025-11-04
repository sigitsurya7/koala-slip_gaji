import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthCookieName, verifyToken } from "@/lib/auth";
import bcrypt from "bcryptjs";

function requireAdmin(req: NextRequest) {
  const token = req.cookies.get(getAuthCookieName())?.value;
  const payload = token ? verifyToken(token) : null;
  if (!payload || payload.role !== "Admin") return null;
  return payload;
}

export async function GET(req: NextRequest) {
  const admin = requireAdmin(req);
  if (!admin) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get("page") || 1);
  const perPage = Number(searchParams.get("perPage") || 10);
  const search = searchParams.get("search")?.trim() || "";
  const sortBy = (searchParams.get("sortBy") || "createdAt") as string;
  const sortOrder = (searchParams.get("sortOrder") || "desc") as "asc" | "desc";

  const where = search
    ? {
        OR: [
          { username: { contains: search, mode: "insensitive" } },
          { role: { equals: search as any } },
        ],
      }
    : {};

  const total = await prisma.user.count({ where });
  const items = await prisma.user.findMany({
    where,
    orderBy: (() => {
      if (["username", "role", "createdAt"].includes(sortBy)) return { [sortBy]: sortOrder } as any;
      return { createdAt: "desc" } as any;
    })(),
    skip: (page - 1) * perPage,
    take: perPage,
    select: { id: true, username: true, role: true, createdAt: true },
  });

  return NextResponse.json({ items, total, page, perPage });
}

export async function POST(req: NextRequest) {
  const admin = requireAdmin(req);
  if (!admin) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { username, password, role } = body ?? {};
  if (!username || !password || !role) {
    return NextResponse.json({ message: "username, password, role diperlukan" }, { status: 400 });
  }
  const hashed = await bcrypt.hash(password, 10);
  try {
    const user = await prisma.user.create({
      data: { username, password: hashed, role },
      select: { id: true, username: true, role: true, createdAt: true },
    });
    return NextResponse.json({ item: user }, { status: 201 });
  } catch (e: any) {
    if (e?.code === "P2002") {
      return NextResponse.json({ message: "Username sudah digunakan" }, { status: 409 });
    }
    return NextResponse.json({ message: "Gagal membuat user" }, { status: 500 });
  }
}

