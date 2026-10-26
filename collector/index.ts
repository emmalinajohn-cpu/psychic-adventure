import { sql } from "../src/lib/db";
import { collectAll } from "./collect";
import { groupIntoEvents } from "./dedupe";
import { processPending } from "./process";

const intervalMinutes = Number(process.env.COLLECT_INTERVAL_MINUTES || 15);

async function cycle() {
  const started = new Date();
  const collected = await collectAll();
  // Drain the processing backlog in batches, so a large first run finishes in one cycle
  let processed = 0;
  let failed = 0;
  for (;;) {
    const r = await processPending();
    processed += r.processed;
    failed += r.failed;
    if (r.skipped) console.log(`[processor] skipped: ${r.skipped}`);
    if (r.skipped || r.processed + r.failed === 0) break;
  }
  const grouped = await groupIntoEvents();
  console.log(
    JSON.stringify({ at: started.toISOString(), seconds: (Date.now() - started.getTime()) / 1000, collected, processed, failed, grouped }),
  );
}

async function main() {
  if (process.argv.includes("--once")) {
    await cycle();
    await sql.end();
    return;
  }
  for (;;) {
    try {
      await cycle();
    } catch (err) {
      console.error("[collector] cycle failed", err);
    }
    await new Promise((r) => setTimeout(r, intervalMinutes * 60_000));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
