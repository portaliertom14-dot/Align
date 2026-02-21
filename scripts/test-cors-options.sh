#!/usr/bin/env bash
# Sanity check CORS preflight (OPTIONS) sur les Edge Functions.
# Usage: ./scripts/test-cors-options.sh [SUPABASE_PROJECT_REF]
# Exemple: ./scripts/test-cors-options.sh yuqybxhqhgmeqmcpgtvw

set -e
REF="${1:-yuqybxhqhgmeqmcpgtvw}"
BASE="https://${REF}.supabase.co/functions/v1"
ORIGIN="http://localhost:8081"

echo "Testing OPTIONS with Origin: $ORIGIN"
echo "Base URL: $BASE"
echo ""

for name in generate-dynamic-modules analyze-sector analyze-job generate-feed-module; do
  echo "--- $name ---"
  status=$(curl -s -o /dev/null -w "%{http_code}" -X OPTIONS "${BASE}/${name}" \
    -H "Origin: ${ORIGIN}" \
    -H "Access-Control-Request-Method: POST" \
    -H "Access-Control-Request-Headers: authorization, content-type")
  if [ "$status" = "200" ] || [ "$status" = "204" ]; then
    echo "  OK status=$status"
  else
    echo "  FAIL status=$status (expected 200 or 204)"
  fi
  curl -sI -X OPTIONS "${BASE}/${name}" -H "Origin: ${ORIGIN}" | grep -i access-control || true
  echo ""
done

echo "Rappel: après toute modif des Edge Functions, déployer avec:"
echo "  supabase functions deploy <name>"
echo "  ou: supabase functions deploy"
