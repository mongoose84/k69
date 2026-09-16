#!/bin/sh
# Skriver config.js ud fra VITE_API_URL, så api-adressen kan styres ved
# køretid uden at bygge imaget forfra. Uden variablen bliver apiUrl tom, og
# frontend falder tilbage til samme origin. Derefter kører nginx' egen
# entrypoint som sædvanlig.
set -e

cat > /usr/share/nginx/html/config.js <<EOF
window.__K69_CONFIG__ = { apiUrl: "${VITE_API_URL:-}" };
EOF

exec /docker-entrypoint.sh "$@"
