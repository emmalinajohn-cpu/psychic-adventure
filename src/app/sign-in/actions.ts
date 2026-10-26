"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { startSession } from "@/lib/auth";
import { sql } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { allow } from "@/lib/ratelimit";

export interface SignInState {
  error?: string;
}

export async function signIn(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!allow(`ip:${ip}`, 20, 15 * 60_000) || !allow(`email:${email}`, 8, 15 * 60_000)) {
    return { error: "Too many attempts. Try again in 15 minutes." };
  }
  const [user] = await sql<{ id: string; password_hash: string; status: string }[]>`
    select id, password_hash, status from users where email = ${email}`;
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    await audit(user?.id ?? null, "auth.sign_in_failed", email);
    return { error: "Email or password is incorrect." };
  }
  if (user.status === "suspended" || user.status === "rejected") return { error: "This account doesn't have access." };
  await startSession(user.id);
  await audit(user.id, "auth.signed_in");
  redirect(user.status === "approved" ? "/dashboard" : "/account");
}
