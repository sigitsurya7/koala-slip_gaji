import jwt, { JwtPayload } from "jsonwebtoken";

export type JWTPayload = {
  sub: number;
  username: string;
  role: "Admin" | "Member";
};

const AUTH_COOKIE = "session";

export const getAuthCookieName = () => AUTH_COOKIE;

export function signToken(payload: JWTPayload, expiresIn: string = "7d") {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return jwt.sign(payload as unknown as JwtPayload, secret, { expiresIn } as any) as string;
}

export function verifyToken(token: string): JWTPayload | null {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  try {
    const decoded = jwt.verify(token, secret);
    if (typeof decoded === "string") return null;
    const d = decoded as JwtPayload & Partial<JWTPayload>;
    if (!d.sub || !d.username || !d.role) return null;
    return { sub: Number(d.sub), username: String(d.username), role: d.role as any };
  } catch {
    return null;
  }
}
