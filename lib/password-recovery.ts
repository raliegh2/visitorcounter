import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "cvas_password_recovery";
const MAX_AGE_SECONDS = 10 * 60;
const PURPOSE = "password_recovery";

type RecoveryAuthorization = {
  sub: string;
  exp: number;
  purpose: typeof PURPOSE;
};

function secret(): string {
  const value = process.env.REAUTH_COOKIE_SECRET;
  if (!value || value.length < 32) {
    throw new Error("REAUTH_COOKIE_SECRET must contain at least 32 characters.");
  }
  return value;
}

function signature(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

function encode(userId: string, expiresAt: number): string {
  const payload = Buffer.from(
    JSON.stringify({ sub: userId, exp: expiresAt, purpose: PURPOSE } satisfies RecoveryAuthorization)
  ).toString("base64url");
  return `${payload}.${signature(payload)}`;
}

function verify(token: string, userId: string): boolean {
  const separator = token.lastIndexOf(".");
  if (separator <= 0 || separator === token.length - 1) return false;

  const payload = token.slice(0, separator);
  const providedSignature = token.slice(separator + 1);
  const expected = Buffer.from(signature(payload));
  const provided = Buffer.from(providedSignature);
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) return false;

  try {
    const authorization = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Partial<RecoveryAuthorization>;
    return (
      authorization.purpose === PURPOSE &&
      authorization.sub === userId &&
      Number.isSafeInteger(authorization.exp) &&
      Number(authorization.exp) > Math.floor(Date.now() / 1000)
    );
  } catch {
    return false;
  }
}

export async function markPasswordRecoveryAuthorized(userId: string): Promise<void> {
  const cookieStore = await cookies();
  const expiresAt = Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS;
  cookieStore.set(COOKIE_NAME, encode(userId, expiresAt), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS
  });
}

export async function hasPasswordRecoveryAuthorization(userId: string): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  return token ? verify(token, userId) : false;
}

export async function clearPasswordRecoveryAuthorization(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
