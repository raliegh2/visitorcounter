import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireAdminAal2 } from "@/lib/auth";

const COOKIE_NAME = "cvas_recent_reauth";
const MAX_AGE_SECONDS = 5 * 60;

function secret(): string {
  const value = process.env.REAUTH_COOKIE_SECRET;
  if (!value || value.length < 32) throw new Error("REAUTH_COOKIE_SECRET must contain at least 32 characters.");
  return value;
}
function signature(payload: string): string { return createHmac("sha256", secret()).update(payload).digest("base64url"); }
function encode(userId: string, expiresAt: number): string {
  const payload = `${userId}.${expiresAt}`;
  return `${payload}.${signature(payload)}`;
}
function verify(token: string, userId: string): boolean {
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [tokenUserId, expiresText, providedSignature] = parts;
  if (!tokenUserId || !expiresText || !providedSignature || tokenUserId !== userId) return false;
  const expiresAt = Number(expiresText);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) return false;
  const payload = `${tokenUserId}.${expiresText}`;
  const expected = Buffer.from(signature(payload));
  const provided = Buffer.from(providedSignature);
  return expected.length === provided.length && timingSafeEqual(expected, provided);
}
export async function markRecentReauth(userId: string): Promise<void> {
  const cookieStore = await cookies();
  const expiresAt = Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS;
  cookieStore.set(COOKIE_NAME, encode(userId, expiresAt), { httpOnly:true, sameSite:"strict", secure:process.env.NODE_ENV === "production", path:"/", maxAge:MAX_AGE_SECONDS });
}
export async function clearRecentReauth(): Promise<void> { (await cookies()).delete(COOKIE_NAME); }
export async function hasRecentReauth(userId: string): Promise<boolean> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  return token ? verify(token, userId) : false;
}
function safeReturnTo(value: string): string { return value.startsWith("/") && !value.startsWith("//") ? value : "/dashboard"; }
export async function requireRecentReauth(returnTo: string): Promise<void> {
  const profile = await requireAdminAal2();
  if (!(await hasRecentReauth(profile.id))) redirect(`/reauth?next=${encodeURIComponent(safeReturnTo(returnTo))}`);
}
