// Creates (or promotes) the first administrator, who then approves everyone else.
// Usage: npm run create-admin -- <email> "<full name>"   (password read from ADMIN_PASSWORD)
import { sql } from "../src/lib/db";
import { hashPassword, validatePassword } from "../src/lib/password";

async function main() {
  const [email, fullName] = process.argv.slice(2);
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !fullName || !password) {
    console.error('Usage: ADMIN_PASSWORD=... npm run create-admin -- <email> "<full name>"');
    process.exit(1);
  }
  const problem = validatePassword(password);
  if (problem) throw new Error(problem);
  const hash = await hashPassword(password);
  await sql`
    insert into users (email, password_hash, full_name, organisation, position, intended_use, role, status, email_verified_at, decided_at)
    values (${email.toLowerCase()}, ${hash}, ${fullName}, 'Pacific Watchmen', 'Administrator', 'Platform administration', 'admin', 'approved', now(), now())
    on conflict (email) do update set role = 'admin', status = 'approved', password_hash = excluded.password_hash,
      email_verified_at = coalesce(users.email_verified_at, now())`;
  await sql`insert into audit_log (action, target) values ('admin.created_by_script', ${email.toLowerCase()})`;
  console.log(`Administrator ready: ${email}`);
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
