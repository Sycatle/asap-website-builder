#!/usr/bin/env bash
# Restore an ASAP Postgres backup produced by infra/kubernetes/base/postgres/backup-cronjob.yaml.
#
# Usage:
#   ./scripts/backup/restore.sh <s3-key|local-file> <target-database-url>
#
# Examples:
#   ./scripts/backup/restore.sh s3://asap-backups-prod/postgres/20260601T020000Z.dump.gpg \
#       postgres://asap:secret@postgres-restore.asap-restore.svc:5432/asap
#   ./scripts/backup/restore.sh ./local.dump.gpg postgres://asap:secret@localhost:5432/asap
#
# Requirements: aws-cli (only for s3:// sources), gpg with the private key imported,
# postgresql-client (pg_restore), and either GPG_PASSPHRASE env or an unlocked agent.
#
# Safety:
#   - Refuses to run against a database whose name matches the live cluster
#     ($PROD_DB_HOST), unless FORCE=1 is set.
#   - Always restores into a transaction (--single-transaction) so a failed
#     restore does not leave the target half-populated.

set -euo pipefail

SOURCE="${1:-}"
TARGET_URL="${2:-}"

if [[ -z "$SOURCE" || -z "$TARGET_URL" ]]; then
  echo "usage: $0 <s3-key|local-file> <target-database-url>" >&2
  exit 2
fi

if [[ -n "${PROD_DB_HOST:-}" && "$TARGET_URL" == *"${PROD_DB_HOST}"* && "${FORCE:-0}" != "1" ]]; then
  echo "refusing to restore into production host ${PROD_DB_HOST} (set FORCE=1 to override)" >&2
  exit 3
fi

WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT
ENCRYPTED="$WORKDIR/backup.dump.gpg"
DUMP="$WORKDIR/backup.dump"

if [[ "$SOURCE" == s3://* ]]; then
  echo "downloading $SOURCE..."
  aws s3 cp "$SOURCE" "$ENCRYPTED" --endpoint-url "${AWS_ENDPOINT_URL:-https://s3.amazonaws.com}"
else
  cp "$SOURCE" "$ENCRYPTED"
fi

echo "decrypting..."
if [[ -n "${GPG_PASSPHRASE:-}" ]]; then
  gpg --batch --yes --pinentry-mode loopback --passphrase "$GPG_PASSPHRASE" --decrypt --output "$DUMP" "$ENCRYPTED"
else
  gpg --batch --yes --decrypt --output "$DUMP" "$ENCRYPTED"
fi

echo "restoring into $TARGET_URL..."
pg_restore \
  --dbname="$TARGET_URL" \
  --no-owner \
  --no-privileges \
  --single-transaction \
  --exit-on-error \
  "$DUMP"

echo "restore complete"
