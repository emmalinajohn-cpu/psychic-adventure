import Link from "next/link";
import { audit } from "@/lib/audit";
import { hashToken } from "@/lib/auth";
import { sql } from "@/lib/db";
import { sendMail } from "@/lib/mail";

export const dynamic = "force-dynamic";

async function notifyAdmins(name: string, organisation: string) {
  const admins = await sql<{ email: string }[]>`select email from users where role = 'admin' and status = 'approved'`;
  for (const a of admins) {
    await sendMail(a.email, "New Pacific Watchmen access request", `${name} (${organisation}) has verified their email and is waiting for review in Admin → Access requests.`);
  }
}

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  let ok = false;
  if (token) {
    const rows = await sql<{ user_id: string; full_name: string; organisation: string }[]>`
      update email_tokens t set used_at = now()
      from users u
      where t.token_hash = ${hashToken(token)} and t.purpose = 'verify_email' and t.used_at is null and t.expires_at > now() and u.id = t.user_id
      returning t.user_id, u.full_name, u.organisation`;
    if (rows.length) {
      ok = true;
      const r = rows[0];
      await sql`update users set email_verified_at = now(), status = 'pending' where id = ${r.user_id} and status = 'unverified'`;
      await audit(r.user_id, "access.email_verified");
      await notifyAdmins(r.full_name, r.organisation);
    }
  }
  return (
    <div className="mx-auto max-w-xl px-4 py-16 sm:px-6">
      <div className="panel p-6">
        {ok ? (
          <>
            <p className="font-semibold">Email verified</p>
            <p className="mt-2 text-sm text-muted">Your request is now pending administrator review. We'll email you when it's decided.</p>
          </>
        ) : (
          <>
            <p className="font-semibold">This link is invalid or has expired</p>
            <p className="mt-2 text-sm text-muted">Request access again to get a new link.</p>
          </>
        )}
        <Link href="/" className="btn mt-4">Back to home</Link>
      </div>
    </div>
  );
}
