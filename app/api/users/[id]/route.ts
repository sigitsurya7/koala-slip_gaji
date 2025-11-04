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

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = requireAdmin(req);
  if (!admin) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const id = Number(params.id);
  const body = await req.json();
  const data: any = {};
  if (body.username) data.username = body.username;
  if (body.role) data.role = body.role;
  if (body.password) data.password = await bcrypt.hash(body.password, 10);

  try {
    const updated = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, username: true, role: true, createdAt: true },
    });
    return NextResponse.json({ item: updated });
  } catch (e: any) {
    if (e?.code === "P2002") {
      return NextResponse.json({ message: "Username sudah digunakan" }, { status: 409 });
    }
    return NextResponse.json({ message: "Gagal memperbarui user" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = requireAdmin(req);
  if (!admin) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const id = Number(params.id);
  try {
    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ message: "Gagal menghapus user" }, { status: 500 });
  }
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = requireAdmin(req);
  if (!admin) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const id = Number(params.id);
  const item = await prisma.user.findUnique({ select: { id: true, username: true, role: true, createdAt: true }, where: { id } });
  if (!item) return NextResponse.json({ message: "Not found" }, { status: 404 });
  return NextResponse.json({ item });
}

