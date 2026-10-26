"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { newToken } from "@/lib/auth";
import { sql } from "@/lib/db";
import { appUrl, sendMail } from "@/lib/mail";
import { hashPassword, validatePassword } from "@/lib/password";

const Form = z.object({
  full_name: z.string().trim().min(2).max(120),
  organisation: z.string().trim().min(2).max(160),
  position: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(200),
  intended_use: z.string().trim().min(20, "Please describe your intended use in a sentence or two.").max(2000),
  password: z.string(),
});

export interface RequestState {
  error?: string;
}

export async function requestAccess(_prev: RequestState, formData: FormData): Promise<RequestState> {
  const parsed = Form.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please complete every field." };
  const f = parsed.data;
  const pwProblem = validatePassword(f.password);
  if (pwProblem) return { error: pwProblem };

  const [existing] = await sql`select id from users where email = ${f.email}`;
  if (!existing) {
    const [user] = await sql<{ id: string }[]>`
      insert into users (email, password_hash, full_name, organisation, position, intended_use)
      values (${f.email}, ${await hashPassword(f.password)}, ${f.full_name}, ${f.organisation}, ${f.position}, ${f.intended_use})
      returning id`;
    const { token, hash } = newToken();
    await sql`insert into email_tokens (token_hash, user_id, purpose, expires_at) values (${hash}, ${user.id}, 'verify_email', now() + interval '2 days')`;
    await sendMail(
      f.email,
      "Verify your email for Pacific Watchmen",
      `Kia ora ${f.full_name},\n\nPlease confirm your email address to continue your access request:\n${appUrl(`/verify?token=${token}`)}\n\nThe link expires in 48 hours. After you verify, an administrator will review your request.\n\nPacific Watchmen`,
    );
    await audit(user.id, "access.requested", f.email, { organisation: f.organisation });
  }
  // Same response whether or not the email was already registered, so the form can't be used to probe accounts
  redirect("/request-access?sent=1");
}
