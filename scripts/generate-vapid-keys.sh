#!/bin/bash
# Generate VAPID keys for Web Push notifications
# 
# These keys are required for PWA push notifications.
# Run this script once and store the keys securely.

set -e

echo "Generating VAPID keys for Web Push notifications..."
echo ""

# Check if openssl is available
if ! command -v openssl &> /dev/null; then
    echo "Error: openssl is not installed"
    exit 1
fi

# Generate private key (P-256 curve)
PRIVATE_KEY_PEM=$(openssl ecparam -genkey -name prime256v1 -noout 2>/dev/null)

# Extract raw private key bytes and encode to base64url
PRIVATE_KEY=$(echo "$PRIVATE_KEY_PEM" | openssl ec -outform DER 2>/dev/null | tail -c 32 | base64 | tr '+/' '-_' | tr -d '=')

# Generate public key from private key
PUBLIC_KEY=$(echo "$PRIVATE_KEY_PEM" | openssl ec -pubout -outform DER 2>/dev/null | tail -c 65 | base64 | tr '+/' '-_' | tr -d '=')

echo "=== VAPID Keys Generated ==="
echo ""
echo "Public Key (for frontend and database):"
echo "$PUBLIC_KEY"
echo ""
echo "Private Key (keep secret!):"
echo "$PRIVATE_KEY"
echo ""
echo "=== Environment Variables ==="
echo ""
echo "Add these to your .env files:"
echo ""
echo "VAPID_PUBLIC_KEY=$PUBLIC_KEY"
echo "VAPID_PRIVATE_KEY=$PRIVATE_KEY"
echo "VAPID_SUBJECT=mailto:support@asap.cool"
echo ""
echo "=== Database Insert ==="
echo ""
echo "Or insert into database (recommended for production):"
echo ""
echo "INSERT INTO vapid_keys (name, public_key, private_key)"
echo "VALUES ('default', '$PUBLIC_KEY', '$PRIVATE_KEY');"
echo ""
