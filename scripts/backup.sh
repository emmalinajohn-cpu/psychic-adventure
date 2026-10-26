#!/usr/bin/env bash
# Nightly encrypted database backup. Run from cron on the server, e.g.
#   15 2 * * * cd /opt/pacific-watchmen && ./scripts/backup.sh
# Requires BACKUP_PASSPHRASE in the environment and copies the file to
# BACKUP_TARGET (an rsync destination at a second Fiji site) when set.
set -euo pipefail
stamp=$(date -u +%Y%m%dT%H%M%SZ)
mkdir -p backups
docker compose exec -T db pg_dump -U pw -d pw --format=custom \
  | gpg --batch --yes --symmetric --cipher-algo AES256 --passphrase "${BACKUP_PASSPHRASE:?}" \
  > "backups/pw-${stamp}.dump.gpg"
find backups -name 'pw-*.dump.gpg' -mtime +30 -delete
if [[ -n "${BACKUP_TARGET:-}" ]]; then
  rsync -a backups/ "${BACKUP_TARGET}"
fi
echo "backup written: backups/pw-${stamp}.dump.gpg"
