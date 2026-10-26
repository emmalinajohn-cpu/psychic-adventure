# Pacific Watchmen

Pacific Security Intelligence: a restricted-access OSINT platform for Pacific regional security.
It collects reporting from regional, government, media and research sources every 15 minutes,
processes each item with Claude (countries, themes, entities, summaries, alert category), scores
credibility, merges duplicate reports into events, and holds every item in an analyst review queue
before it reaches any dashboard. Nothing on screen is hand-entered or sample data.

## How it fits together

| Part | Path | What it does |
| --- | --- | --- |
| Web app | `src/app` | Next.js site: public pages, request-access flow, analyst dashboard, admin tools |
| Collector | `collector/` | Long-running worker: fetch feeds → store items → Claude processing → events and alerts |
| Database | `db/migrations` | Postgres schema; `npm run migrate` applies it and seeds countries, themes and sources |
| Reference data | `src/lib/reference.ts` | The 22 Pacific Island Countries and Territories and the 8 security themes |
| Sources | `src/lib/sources.ts` | Monitored feeds and their base credibility |
| Alert rules | `src/lib/priority.ts` | Category → priority mapping from the platform spec |

Access levels: public visitor, registered (pending), analyst, senior analyst, administrator.
New users request access, verify their email, then wait for an administrator to approve them.

## Run locally

Requires Node 22 and Postgres 16.

```bash
npm install
cp .env.example .env            # set DATABASE_URL, and ANTHROPIC_API_KEY to process items
npm run migrate
ADMIN_PASSWORD='a-long-password' npm run create-admin -- you@example.org "Your Name"
npm run collect:once            # one collection cycle
npm run dev                     # http://localhost:3000
```

Without `SMTP_URL`, verification and approval emails are printed to the web server's log.

## Checks

```bash
npm run lint    # TypeScript
npm test        # unit tests
npm run build
```

## Deploy

See [DEPLOY.md](DEPLOY.md).
