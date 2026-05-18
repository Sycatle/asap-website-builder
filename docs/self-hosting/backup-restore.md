# Backups & disaster recovery

ASAP ships a daily encrypted Postgres backup pipeline. This document is the
runbook: how to set it up, how to verify it runs, and how to restore from
scratch when the worst happens.

## Architecture

- A Kubernetes `CronJob` (`infra/kubernetes/base/postgres/backup-cronjob.yaml`)
  runs daily at 02:00 UTC inside the `asap` namespace.
- The job streams `pg_dump --format=custom` through `gpg --encrypt` and
  uploads the result to S3-compatible object storage (`s3://<bucket>/postgres/<UTC-stamp>.dump.gpg`).
- Encryption is **client-side**, with a key pair you control. The cluster
  only holds the public key. The private key never touches the cluster or CI.
- Retention is enforced by the bucket's lifecycle policy (recommended: 30 days
  hot + 1 year cold; see "Bucket policy" below).
- A monthly restore drill (`.github/workflows/restore-drill.yml`) validates the
  pipeline end-to-end against a disposable staging database.

## One-time setup

### 1. Generate the GPG key pair (workstation, not CI)

```bash
mkdir -p ~/asap-backup-keys && cd ~/asap-backup-keys

cat >gen.conf <<'EOF'
%no-protection
Key-Type: RSA
Key-Length: 4096
Subkey-Type: RSA
Subkey-Length: 4096
Name-Real: ASAP Backups
Name-Email: backups@asap.cool
Expire-Date: 0
%commit
EOF

gpg --batch --gen-key gen.conf
gpg --armor --export backups@asap.cool > public.asc
gpg --armor --export-secret-keys backups@asap.cool > private.asc
shred -u gen.conf

# Move private.asc to your offline secrets vault (1Password, hardware token, etc.)
# Lose it and the dumps are unrecoverable.
```

### 2. Create the bucket

Any S3-compatible target works (AWS S3, Cloudflare R2, Backblaze B2, MinIO, etc.).
Provision:

- a bucket dedicated to backups (e.g. `asap-backups-prod`),
- an IAM identity scoped to `s3:PutObject`, `s3:GetObject`, `s3:ListBucket`
  on that bucket only,
- a lifecycle policy that transitions objects older than 30 days to a cold tier
  and expires them after 365 days,
- versioning + MFA-delete if your provider supports it.

### 3. Create the Kubernetes secret

Copy the template and fill it in:

```bash
cp infra/kubernetes/base/postgres/backup-secret.example.yaml /tmp/asap-backup.yaml
# edit /tmp/asap-backup.yaml: bucket, region, endpoint, access keys, gpg recipient,
# and paste the contents of public.asc into gpg-public-key.
kubectl apply -f /tmp/asap-backup.yaml
shred -u /tmp/asap-backup.yaml
```

In a sealed-secrets / external-secrets setup, render the same shape from your
secret backend instead of `kubectl apply`-ing plaintext.

### 4. Roll out the CronJob

```bash
kubectl apply -k infra/kubernetes/overlays/production
kubectl -n asap get cronjob asap-postgres-backup
```

## Smoke test

Trigger a backup immediately and verify the object lands on S3:

```bash
kubectl -n asap create job --from=cronjob/asap-postgres-backup backup-smoke-$(date +%s)
kubectl -n asap logs -l job-name=backup-smoke-... --tail=-1
aws s3 ls s3://asap-backups-prod/postgres/ | tail -5
```

The job's last log line is `uploaded s3://.../postgres/<stamp>.dump.gpg`.

## Restore

`scripts/backup/restore.sh` is the canonical restore path. It downloads, decrypts,
and runs `pg_restore --single-transaction`.

```bash
# 1. Import the private key on the machine that will perform the restore
gpg --import ~/asap-backup-keys/private.asc

# 2. Restore into a NEW empty database (never overwrite a live one)
psql "$ADMIN_DB_URL" -c "CREATE DATABASE asap_restore"

# 3. Run the script
GPG_PASSPHRASE="<if-protected>" \
PROD_DB_HOST="postgres.asap.svc" \
./scripts/backup/restore.sh \
  s3://asap-backups-prod/postgres/20260601T020000Z.dump.gpg \
  "postgres://asap:$PASSWORD@asap-restore-host:5432/asap_restore"

# 4. Sanity-check
psql "$RESTORE_URL" -c "SELECT count(*) FROM websites"
```

The script refuses to target `$PROD_DB_HOST` unless `FORCE=1` is set, so an
absent-minded paste cannot clobber production.

## Restore drill

A successful backup that no one has ever restored is not a backup. The
`restore-drill.yml` workflow runs monthly (and on manual dispatch) and:

1. Picks the most recent dump.
2. Spins up an ephemeral Postgres pod in `asap-restore`.
3. Runs `restore.sh` end-to-end with `FORCE=1`.
4. Executes a row-count assertion (`SELECT count(*) FROM websites > 0`).
5. Tears the pod down.

A red drill is a P1 incident — your backups are not actually working.

## Recovery objectives

| Metric | Target | How it is met |
|---|---|---|
| RPO (data loss tolerance) | 24 h | Daily dump cadence. Set the schedule to `0 */6 * * *` for 6 h RPO. |
| RTO (time to recover) | 1 h | `pg_restore --single-transaction` on a freshly provisioned instance. |
| Verified restorability | monthly | Restore drill workflow. |

## Bucket policy (example, AWS)

```json
{
  "Rules": [
    {
      "ID": "ASAP backups lifecycle",
      "Status": "Enabled",
      "Filter": { "Prefix": "postgres/" },
      "Transitions": [
        { "Days": 30, "StorageClass": "STANDARD_IA" },
        { "Days": 90, "StorageClass": "GLACIER" }
      ],
      "Expiration": { "Days": 365 }
    }
  ]
}
```

## Threat model notes

- Dumps are encrypted client-side; a compromised bucket leaks ciphertext only.
- The cluster never holds the private key.
- The S3 IAM principal cannot `DeleteObject`; deletions go through bucket
  lifecycle, which an attacker cannot accelerate without separate IAM.
- Migrating to a managed service (RDS, Cloud SQL, Aiven) with point-in-time
  recovery is the recommended upgrade once the project has paying customers.
