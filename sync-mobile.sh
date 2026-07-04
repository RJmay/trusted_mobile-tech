#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────
# Regenerate mobile.html from index.html (index.html is the single source
# of truth). The ONLY difference between the two files: mobile.html pins a
# fixed 1280px viewport, so phones render the full DESKTOP layout scaled
# down to fit the screen (no responsive reflow — every mobile breakpoint in
# the CSS is above 1200px, so none of them fire at 1280).
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

perl -0pe 's{<meta name="viewport"[^>]*>}{<meta name="viewport" content="width=1280">\n  <!-- AUTO-GENERATED from index.html by sync-mobile.sh - do not edit directly. Edit index.html, then run ./sync-mobile.sh -->}' "$SRC" > "$OUT"

# Sanity check: the swap must have happened exactly once.
if ! grep -q 'content="width=1280"' "$OUT"; then
  echo "error: viewport swap failed - $OUT not written correctly" >&2
  exit 1
fi

echo "OK - wrote $OUT from $SRC ($(wc -l < "$OUT" | tr -d ' ') lines)."
