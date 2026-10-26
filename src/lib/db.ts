import postgres from "postgres";

declare global {
  // Reuse one pool across hot reloads in development
  var __pwSql: postgres.Sql | undefined;
}

function pool(): postgres.Sql {
  if (!globalThis.__pwSql) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    globalThis.__pwSql = postgres(url, { max: 10, idle_timeout: 30 });
  }
  return globalThis.__pwSql;
}

// Connects on first use, so modules that import it (and their tests) load without a database
export const sql = new Proxy(function () {} as unknown as postgres.Sql, {
  apply: (_t, _this, args) => (pool() as unknown as (...a: unknown[]) => unknown)(...args),
  get: (_t, prop) => {
    const value = Reflect.get(pool(), prop);
    return typeof value === "function" ? value.bind(pool()) : value;
  },
});
