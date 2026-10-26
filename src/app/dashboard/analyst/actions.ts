"use server";

import Anthropic from "@anthropic-ai/sdk";
import { redirect } from "next/navigation";
import { z } from "zod";
import { ask, ANALYST_MODEL, type AnalystResult } from "@/lib/analyst";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import { sql } from "@/lib/db";
import { allow } from "@/lib/ratelimit";
import { COUNTRY_BY_ISO, THEME_BY_SLUG } from "@/lib/reference";

const Question = z.object({
  question: z.string().trim().min(5).max(1000),
  country: z.string().optional().transform((v) => (v && COUNTRY_BY_ISO.has(v) ? v : undefined)),
  theme: z.string().optional().transform((v) => (v && THEME_BY_SLUG.has(v) ? v : undefined)),
  days: z.coerce.number().optional().transform((v) => (v === 30 || v === 90 || v === 365 ? v : undefined)),
});

export async function askAnalyst(formData: FormData) {
  const user = await requireRole("analyst");
  const parsed = Question.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/dashboard/analyst?error=question");
  const { question, ...filters } = parsed.data;

  if (!process.env.ANTHROPIC_API_KEY) redirect("/dashboard/analyst?error=not_configured");
  if (!allow(`analyst:${user.id}`, 30, 60 * 60 * 1000)) redirect("/dashboard/analyst?error=rate");

  let result: AnalystResult | null = null;
  let error: string | null = null;
  try {
    result = await ask(question, filters);
  } catch (err) {
    error = err instanceof Anthropic.APIError ? `Claude API error ${err.status ?? ""}`.trim() : "Unexpected error";
    console.error("analyst query failed", err);
  }

  const [row] = await sql<{ id: number }[]>`
    insert into analyst_queries (user_id, question, filters, status, answer, sources, model, input_tokens, output_tokens, error)
    values (${user.id}, ${question}, ${sql.json(filters as never)}, ${result?.status ?? "error"},
      ${sql.json((result?.answer ?? []) as never)}, ${sql.json((result?.sources ?? []) as never)},
      ${result?.model ?? ANALYST_MODEL},
      ${result?.status === "answered" ? result.inputTokens : null}, ${result?.status === "answered" ? result.outputTokens : null},
      ${error})
    returning id`;
  await audit(user.id, "analyst.query", String(row.id), { status: result?.status ?? "error", sources: result?.sources.length ?? 0 });
  redirect(`/dashboard/analyst?id=${row.id}`);
}
