import { sql } from "./db";

export async function audit(userId: string | null, action: string, target?: string, detail: Record<string, unknown> = {}) {
  await sql`insert into audit_log (user_id, action, target, detail) values (${userId}, ${action}, ${target ?? null}, ${sql.json(detail as never)})`;
}
