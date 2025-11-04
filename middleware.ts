import { NextRequest, NextResponse } from "next/server";
import { getAuthCookieName } from "@/lib/auth";

const PUBLIC_PATHS = ["/login", "/favicon.ico"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isApi = pathname.startsWith("/api");
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith("/_next") || pathname.startsWith("/icons") || pathname.startsWith("/images") || pathname.startsWith("/assets");

  if (isPublic || isApi) {
    return NextResponse.next();
  }

  const token = req.cookies.get(getAuthCookieName())?.value;
  // Note: Middleware runs on the Edge runtime; avoid heavy verification here.
  // Presence of the auth cookie is enough to allow page navigation.
  if (!token) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/(.*)"],
};
