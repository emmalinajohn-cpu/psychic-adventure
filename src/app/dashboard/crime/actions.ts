"use server";

import Anthropic from "@anthropic-ai/sdk";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import { applyReview, draftAssessment, PERIODS, type Draft, type DraftResult } from "@/lib/crime";
import { sql } from "@/lib/db";
import { allow } from "@/lib/ratelimit";
import { COUNTRY_BY_ISO } from "@/lib/reference";

const DraftRequest = z.object({
  country: z.string().optional().transform((v) => (v && COUNTRY_BY_ISO.has(v) ? v : null)),
  days: z.coerce.number().refine((v) => (PERIODS as readonly number[]).includes(v)),
});

export async function createDraft(formData: FormData) {
  const user = await requireRole("analyst");
  const req = DraftRequest.safeParse(Object.fromEntries(formData));
  if (!req.success) redirect("/dashboard/crime?error=request");
  if (!process.env.ANTHROPIC_API_KEY) redirect("/dashboard/crime?error=not_configured");
  if (!allow(`crime:${user.id}`, 10, 60 * 60 * 1000)) redirect("/dashboard/crime?error=rate");

  const to = new Date();
  const from = new Date(to.getTime() - req.data.days * 86_400_000);
  let result: DraftResult;
  try {
    result = await draftAssessment(req.data.country, from, to);
  } catch (err) {
    console.error("crime draft failed", err);
    redirect(`/dashboard/crime?error=${err instanceof Anthropic.APIError ? "api" : "failed"}`);
  }
  if (result.status === "too_few") redirect(`/dashboard/crime?error=too_few&n=${result.reports}`);
  if (result.status === "declined") redirect("/dashboard/crime?error=declined");

  const [row] = await sql<{ id: number }[]>`
    insert into crime_assessments (country_iso, period_start, period_end, content, sources, model, drafted_by)
    values (${req.data.country}, ${from}, ${to}, ${sql.json(result.draft as never)}, ${sql.json(result.sources as never)},
      ${result.model}, ${user.id})
    returning id`;
  await audit(user.id, "crime.drafted", String(row.id), { country: req.data.country, days: req.data.days, sources: result.sources.length });
  redirect(`/dashboard/crime/${row.id}`);
}

const Review = z.object({
  id: z.coerce.number().int().positive(),
  bottom_line: z.string().max(4000).default(""),
  note: z.string().max(1000).optional(),
});

export async function reviewAssessment(decision: "publish" | "reject", formData: FormData) {
  const user = await requireRole("analyst");
  const r = { ...Review.parse(Object.fromEntries(formData)), decision: z.enum(["publish", "reject"]).parse(decision) };
  const [a] = await sql<{ content: Draft; status: string }[]>`select content, status from crime_assessments where id = ${r.id}`;
  if (!a || a.status !== "draft") redirect(`/dashboard/crime/${r.id}`);

  if (r.decision === "publish") {
    const kept = new Set(formData.getAll("keep").map(String));
    const content = applyReview(a.content, kept, r.bottom_line);
    await sql`
      update crime_assessments set status = 'published', content = ${sql.json(content as never)},
        reviewed_by = ${user.id}, reviewed_at = now(), review_note = ${r.note || null}
      where id = ${r.id} and status = 'draft'`;
  } else {
    await sql`
      update crime_assessments set status = 'rejected', reviewed_by = ${user.id}, reviewed_at = now(), review_note = ${r.note || null}
      where id = ${r.id} and status = 'draft'`;
  }
  await audit(user.id, `crime.${r.decision === "publish" ? "published" : "rejected"}`, String(r.id));
  revalidatePath("/dashboard/crime");
  redirect(`/dashboard/crime/${r.id}`);
}
