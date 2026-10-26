# Deploying to a server in Fiji

The platform runs as four containers (Postgres, web, collector, Caddy for HTTPS) on one Linux
server. For more headroom, run Postgres on a second server and point `DATABASE_URL` at it.

## 1. Server

- Ubuntu 24.04 LTS, about 4 vCPU, 16 GB RAM, 200 GB SSD, from a Fiji provider.
- A domain name with an A record pointing at the server's public IP.
- Open ports 80 and 443 only (plus SSH, ideally restricted to known addresses).
- Install Docker Engine with the Compose plugin.

## 2. Configure

```bash
git clone https://github.com/emmalinajohn-cpu/psychic-adventure.git /opt/pacific-watchmen
cd /opt/pacific-watchmen
cp .env.example .env
```

Edit `.env`: set `SITE_DOMAIN`, `APP_URL=https://<your domain>`, a strong `POSTGRES_PASSWORD`,
`ANTHROPIC_API_KEY`, `SMTP_URL` and `MAIL_FROM`, and optionally `GUARDIAN_API_KEY`.
`DATABASE_URL` is set by docker-compose and can be left as is.

## 3. Start

```bash
docker compose up -d --build
docker compose run --rm -e ADMIN_PASSWORD='a-long-password' web npm run create-admin -- you@example.org "Your Name"
docker compose logs -f collector     # first collection runs immediately
```

Sign in at `https://<your domain>/sign-in`. New access requests appear under Admin → Access Requests.

## 4. Backups

Set `BACKUP_PASSPHRASE` (and `BACKUP_TARGET`, an rsync destination at a second site) in the
crontab environment, then schedule `scripts/backup.sh` nightly. Restore with
`gpg -d file.dump.gpg | docker compose exec -T db pg_restore -U pw -d pw --clean`.

## 5. Updates

```bash
git pull && docker compose up -d --build
```

Migrations run automatically before the web and collector containers start.

## What leaves Fiji

Only calls to the Claude API (item text from public sources, and later the questions analysts ask
the AI Analyst). User accounts, review decisions, scores and the search index stay on the server.
