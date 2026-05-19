#!/bin/bash
# End-to-end HTTP smoke test for the AI section codegen pipeline.
#
# Boots a fresh test account via /auth/signup, creates a website + element,
# runs the codegen endpoint with a valid section + several invalid ones,
# asserts the validator codes + compiled module endpoint return what we expect.
#
# Prerequisites: API + Postgres up on http://localhost:3000 (e.g. `make dev`).
#
# Exits 0 on full success, non-zero otherwise. Output is machine-readable
# (`PASS:` / `FAIL:` prefixes per test) so we can wire it into CI later.

set -euo pipefail

API="${API_URL:-http://localhost:3000/api}"
EMAIL="codegen-smoke-$(date +%s)@example.com"
PASS="TestPassword42!"
COOKIES=$(mktemp)
trap 'rm -f "$COOKIES"' EXIT

log_pass() { echo "PASS: $*"; }
log_fail() { echo "FAIL: $*"; exit 1; }
require() {
  local desc="$1"; shift
  if eval "$@"; then log_pass "$desc"; else log_fail "$desc"; fi
}

echo "=== signup ==="
csrf=$(curl -fsS -c "$COOKIES" "$API/auth/csrf-token" | python3 -c "import sys,json;print(json.load(sys.stdin)['csrf_token'])")
signup=$(curl -fsS -b "$COOKIES" -c "$COOKIES" -X POST "$API/auth/signup" \
  -H "Content-Type: application/json" -H "X-CSRF-Token: $csrf" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\",\"full_name\":\"Codegen Smoke\"}")
TOKEN=$(echo "$signup" | python3 -c "import sys,json;print(json.load(sys.stdin)['access_token'])")
require "signup returned access token" '[ ${#TOKEN} -gt 50 ]'

auth=(-H "Authorization: Bearer $TOKEN" -H "X-CSRF-Token: $csrf")

echo "=== create website ==="
slug="codegen-smoke-$(date +%s)"
web=$(curl -fsS -b "$COOKIES" -X POST "$API/websites" \
  -H "Content-Type: application/json" "${auth[@]}" \
  -d "{\"title\":\"Codegen Smoke\",\"slug\":\"$slug\",\"creation_mode\":\"from_scratch\"}")
WEB_ID=$(echo "$web" | python3 -c "import sys,json;print(json.load(sys.stdin)['id'])")
require "created website" '[ ${#WEB_ID} -eq 36 ]'

echo "=== create element ==="
elem=$(curl -fsS -b "$COOKIES" -X POST "$API/websites/$WEB_ID/elements" \
  -H "Content-Type: application/json" "${auth[@]}" \
  -d '{"element_type":"hero","slug":"hero","title":"Hero","order":0,"layout":"full","settings":{},"visible":true}')
ELEM_ID=$(echo "$elem" | python3 -c "import sys,json;print(json.load(sys.stdin)['id'])")
require "created element" '[ ${#ELEM_ID} -eq 36 ]'

post_code() {
  local body_file="$1"
  curl -sS -o /tmp/asap-code-resp.json -w "%{http_code}" \
    -b "$COOKIES" -X POST "$API/websites/$WEB_ID/elements/$ELEM_ID/code" \
    -H "Content-Type: application/json" "${auth[@]}" -d @"$body_file"
}

echo "=== valid section ==="
cat > /tmp/asap-good.json <<'EOF'
{"source_code":"import { useVariable, useCollection } from '@asap/site-runtime';\nexport default function Hero({ size = 'lg' }) {\n  const headline = useVariable('hero_headline', 'Hi');\n  const logos = useCollection('logos');\n  return (<section className=\"bg-background text-foreground py-24\"><h1 className={size === 'lg' ? 'text-5xl' : 'text-3xl'}>{headline}</h1><p>{logos.length} logos</p></section>);\n}"}
EOF
code=$(post_code /tmp/asap-good.json)
require "valid section returns 200" '[ "$code" = "200" ]'
body=$(cat /tmp/asap-code-resp.json)
require "response.ok is true" 'echo "$body" | python3 -c "import sys,json;sys.exit(0 if json.load(sys.stdin)[\"ok\"] else 1)"'
require "data_bindings.variables contains hero_headline" \
  'echo "$body" | python3 -c "import sys,json;d=json.load(sys.stdin);sys.exit(0 if \"hero_headline\" in d[\"data_bindings\"][\"variables\"] else 1)"'
require "data_bindings.collections contains logos" \
  'echo "$body" | python3 -c "import sys,json;d=json.load(sys.stdin);sys.exit(0 if \"logos\" in d[\"data_bindings\"][\"collections\"] else 1)"'
require "knobs_schema has size knob with default lg" \
  'echo "$body" | python3 -c "import sys,json;d=json.load(sys.stdin);k=d[\"knobs_schema\"][\"knobs\"];sys.exit(0 if any(x[\"name\"]==\"size\" and x[\"default\"]==\"lg\" for x in k) else 1)"'

echo "=== rejected: literal color ==="
cat > /tmp/asap-bad-color.json <<'EOF'
{"source_code":"export default function S() { return <div style={{ color: '#ff0000' }} />; }"}
EOF
code=$(post_code /tmp/asap-bad-color.json)
require "literal color returns 422" '[ "$code" = "422" ]'
require "errors include literal_color_in_style" \
  'cat /tmp/asap-code-resp.json | python3 -c "import sys,json;d=json.load(sys.stdin);sys.exit(0 if any(e[\"code\"]==\"literal_color_in_style\" for e in d[\"errors\"]) else 1)"'

echo "=== rejected: forbidden import ==="
cat > /tmp/asap-bad-import.json <<'EOF'
{"source_code":"import fs from 'fs';\nexport default function S() { return null; }"}
EOF
code=$(post_code /tmp/asap-bad-import.json)
require "forbidden import returns 422" '[ "$code" = "422" ]'
require "errors include forbidden_import" \
  'cat /tmp/asap-code-resp.json | python3 -c "import sys,json;d=json.load(sys.stdin);sys.exit(0 if any(e[\"code\"]==\"forbidden_import\" for e in d[\"errors\"]) else 1)"'

echo "=== rejected: dangerouslySetInnerHTML ==="
cat > /tmp/asap-bad-html.json <<'EOF'
{"source_code":"export default function S() { return <div dangerouslySetInnerHTML={{ __html: 'x' }} />; }"}
EOF
code=$(post_code /tmp/asap-bad-html.json)
require "dangerouslySetInnerHTML returns 422" '[ "$code" = "422" ]'
require "errors include dangerously_set_inner_html" \
  'cat /tmp/asap-code-resp.json | python3 -c "import sys,json;d=json.load(sys.stdin);sys.exit(0 if any(e[\"code\"]==\"dangerously_set_inner_html\" for e in d[\"errors\"]) else 1)"'

echo "=== published site serves the module ==="
# Publish via DB shortcut so we don't need to plumb a /publish handler call
# here. Prefer DATABASE_URL when set (CI), fall back to `docker exec` (local
# dev where the postgres container is named asap-postgres).
publish_sql="UPDATE websites SET status='published' WHERE slug='$slug';"
if [ -n "${DATABASE_URL:-}" ] && command -v psql >/dev/null 2>&1; then
  psql "$DATABASE_URL" -c "$publish_sql" >/dev/null
else
  docker exec asap-postgres psql -U asap -d asap -c "$publish_sql" >/dev/null
fi
module=$(curl -fsS -w '\n%{content_type}\n%{http_code}' "$API/public/sections/$ELEM_ID/module.js")
require "module endpoint returns 200 with application/javascript" \
  'echo "$module" | grep -q "application/javascript"'
require "module rewrites react/jsx-runtime to globalThis.__asapDeps" \
  'echo "$module" | grep -q "globalThis.__asapDeps"'
require "module preserves export default" \
  'echo "$module" | grep -q "export default function"'
require "module no longer contains bare-specifier import" \
  '! (echo "$module" | grep -Eq "^import .* from \"react")'

echo "=== variable visibility filter ==="
# Create one public + one private variable, then confirm only the public one
# leaks into the public data envelope.
curl -fsS -b "$COOKIES" -X PUT "$API/websites/$WEB_ID/variables/public_var" \
  -H "Content-Type: application/json" "${auth[@]}" \
  -d '{"value":"shown","is_public":true}' >/dev/null
curl -fsS -b "$COOKIES" -X PUT "$API/websites/$WEB_ID/variables/secret_var" \
  -H "Content-Type: application/json" "${auth[@]}" \
  -d '{"value":"hidden","is_public":false}' >/dev/null

echo "=== public site data envelope ==="
data=$(curl -fsS "$API/public/websites/$slug/data")
require "data envelope has collections + variables fields" \
  'echo "$data" | python3 -c "import sys,json;d=json.load(sys.stdin);sys.exit(0 if \"collections\" in d and \"variables\" in d else 1)"'
require "public_var is exposed in data envelope" \
  'echo "$data" | python3 -c "import sys,json;d=json.load(sys.stdin);sys.exit(0 if d[\"variables\"].get(\"public_var\")==\"shown\" else 1)"'
require "secret_var is NOT exposed in data envelope" \
  'echo "$data" | python3 -c "import sys,json;d=json.load(sys.stdin);sys.exit(0 if \"secret_var\" not in d[\"variables\"] else 1)"'

echo ""
echo "All assertions passed."
