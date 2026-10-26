"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import { sql } from "@/lib/db";
import { THEME_SLUGS } from "@/lib/reference";

const Decision = z.object({
  id: z.coerce.number().int().positive(),
  decision: z.enum(["approve", "approve_public", "discard"]),
  note: z.string().max(500).optional(),
});

export async function decide(formData: FormData) {
  const user = await requireRole("analyst");
  const d = Decision.parse(Object.fromEntries(formData));
  const status = d.decision === "discard" ? "discarded" : "approved";
  await sql`
    update items set review_status = ${status}, is_public = ${d.decision === "approve_public"},
      reviewed_by = ${user.id}, reviewed_at = now(), review_note = ${d.note || null}
    where id = ${d.id}`;
  await audit(user.id, `review.${d.decision}`, String(d.id));
  revalidatePath("/dashboard", "layout");
}

const Edit = z.object({
  id: z.coerce.number().int().positive(),
  executive_summary: z.string().trim().min(10).max(1000),
  priority: z.enum(["high", "medium", "low"]),
});

export async function editAnalysis(formData: FormData) {
  const user = await requireRole("analyst");
  const e = Edit.parse(Object.fromEntries(formData));
  const themes = formData.getAll("themes").map(String).filter((t) => (THEME_SLUGS as string[]).includes(t));
  await sql`
    update item_analysis set executive_summary = ${e.executive_summary}, priority = ${e.priority}, themes = ${themes}
    where item_id = ${e.id}`;
  await audit(user.id, "review.edited", String(e.id), { priority: e.priority, themes });
  revalidatePath("/dashboard/review");
}

export async function setPublic(formData: FormData) {
  const user = await requireRole("analyst");
  const id = z.coerce.number().int().positive().parse(formData.get("id"));
  const value = formData.get("public") === "1";
  await sql`update items set is_public = ${value} where id = ${id} and review_status = 'approved'`;
  await audit(user.id, value ? "review.made_public" : "review.made_restricted", String(id));
  revalidatePath("/", "layout");
}
