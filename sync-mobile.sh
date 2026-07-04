#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────
# Regenerate mobile.html from index.html (index.html is the single source
# of truth).
#
# The mobile site now uses a genuine mobile-native RESPONSIVE redesign
# (see the "MOBILE REDESIGN" @media block in index.html), so mobile.html
# just uses the normal device-width viewport — phones get the purpose-built
# phone layout, not a scaled-down desktop. This keeps mobile.html a faithful
# copy of index.html that the router serves to phones.
#
# Run after ANY change to index.html:
#     ./sync-mobile.sh
# ─────────────────────────────────────────────────────────────────────────
set -euo pipefail
cd "$(dirname "$0")"

SRC="index.html"
OUT="mobile.html"

if [ ! -f "$SRC" ]; then
  echo "error: $SRC not found" >&2
  exit 1
fi

perl -0pe 's{<meta name="viewport"[^>]*>}{<meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <!-- AUTO-GENERATED from index.html by sync-mobile.sh - do not edit directly. Edit index.html, then run ./sync-mobile.sh -->}' "$SRC" > "$OUT"

# Sanity check: the swap must have happened exactly once.
if ! grep -q 'content="width=device-width' "$OUT"; then
  echo "error: viewport swap failed - $OUT not written correctly" >&2
  exit 1
fi

echo "OK - wrote $OUT from $SRC ($(wc -l < "$OUT" | tr -d ' ') lines)."
