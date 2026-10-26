import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { sql } from "./db";

export type Role = "registered" | "analyst" | "senior_analyst" | "admin";
export type Status = "unverified" | "pending" | "approved" | "rejected" | "suspended";

export interface User {
  id: string;
  email: string;
  full_name: string;
  organisation: string;
  position: string;
  role: Role;
  status: Status;
}

const COOKIE = "pw_session";
const SESSION_DAYS = 14;

const RANK: Record<Role, number> = { registered: 0, analyst: 1, senior_analyst: 2, admin: 3 };

export const ROLE_LABELS: Record<Role, string> = {
  registered: "Registered User",
  analyst: "Analyst",
  senior_analyst: "Senior Analyst",
  admin: "Administrator",
};

export function newToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashToken(token) };
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function startSession(userId: string) {
  const { token, hash } = newToken();
  const expires = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await sql`insert into sessions (token_hash, user_id, expires_at) values (${hash}, ${userId}, ${expires})`;
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  });
}

export async function endSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await sql`delete from sessions where token_hash = ${hashToken(token)}`;
  jar.delete(COOKIE);
}

/** The signed-in user for this request, or null. Cached per request. */
export const currentUser = cache(async (): Promise<User | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const [user] = await sql<User[]>`
    select u.id, u.email, u.full_name, u.organisation, u.position, u.role, u.status
    from sessions s join users u on u.id = s.user_id
    where s.token_hash = ${hashToken(token)} and s.expires_at > now()`;
  return user ?? null;
});

/** True when the user is approved and holds at least the given role. */
export function hasRole(user: User | null, role: Exclude<Role, "registered">): user is User {
  return !!user && user.status === "approved" && RANK[user.role] >= RANK[role];
}

/** For server actions and admin pages: redirect anyone without the role. */
export async function requireRole(role: Exclude<Role, "registered">): Promise<User> {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  if (!hasRole(user, role)) redirect("/account");
  return user;
}
