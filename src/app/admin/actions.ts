"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import { sql } from "@/lib/db";
import { appUrl, sendMail } from "@/lib/mail";

const ROLE = z.enum(["registered", "analyst", "senior_analyst", "admin"]);

export async function decideRequest(formData: FormData) {
  const admin = await requireRole("admin");
  const { id, decision, role } = z
    .object({ id: z.string().uuid(), decision: z.enum(["approve", "reject"]), role: ROLE.default("analyst") })
    .parse(Object.fromEntries(formData));
  const status = decision === "approve" ? "approved" : "rejected";
  const [u] = await sql<{ email: string; full_name: string }[]>`
    update users set status = ${status}, role = ${decision === "approve" ? role : "registered"}, decided_by = ${admin.id}, decided_at = now()
    where id = ${id} and status = 'pending' returning email, full_name`;
  if (!u) return;
  await audit(admin.id, `access.${decision}d`, id, { role });
  await sendMail(
    u.email,
    decision === "approve" ? "Your Pacific Watchmen access is approved" : "Your Pacific Watchmen access request",
    decision === "approve"
      ? `Kia ora ${u.full_name},\n\nYour access has been approved. Sign in at ${appUrl("/sign-in")}\n\nPacific Watchmen`
      : `Kia ora ${u.full_name},\n\nThank you for your interest. Your request for access was not approved.\n\nPacific Watchmen`,
  );
  revalidatePath("/admin", "layout");
}

export async function updateUser(formData: FormData) {
  const admin = await requireRole("admin");
  const { id, role, status } = z
    .object({ id: z.string().uuid(), role: ROLE, status: z.enum(["approved", "suspended"]) })
    .parse(Object.fromEntries(formData));
  if (id === admin.id && (role !== "admin" || status !== "approved")) return; // don't lock yourself out
  await sql`update users set role = ${role}, status = ${status} where id = ${id} and status in ('approved', 'suspended')`;
  if (status === "suspended") await sql`delete from sessions where user_id = ${id}`;
  await audit(admin.id, "user.updated", id, { role, status });
  revalidatePath("/admin/users");
}

export async function updateSource(formData: FormData) {
  const admin = await requireRole("admin");
  const { id, base_credibility, active } = z
    .object({ id: z.coerce.number().int(), base_credibility: z.coerce.number().int().min(0).max(100), active: z.enum(["on"]).optional() })
    .parse(Object.fromEntries(formData));
  await sql`update sources set base_credibility = ${base_credibility}, active = ${active === "on"} where id = ${id}`;
  await audit(admin.id, "source.updated", String(id), { base_credibility, active: active === "on" });
  revalidatePath("/admin/sources");
}
