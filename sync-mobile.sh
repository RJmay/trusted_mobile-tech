#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────
# Regenerate mobile.html from index.html (index.html is the single source
# of truth). The ONLY difference between the two files: mobile.html pins a
# fixed-width viewport, so phones render the full DESKTOP layout scaled
# down to fit the screen (no responsive reflow).
#
# Viewport width = 1000px. The heavy mobile reflow (hero stacks, columns
# collapse) fires at <=980px, so 1000 sits just above it: the layout stays
# identical to desktop, but rendering at 1000 (instead of 1280) makes
# everything ~30% larger and more legible on a phone. Keep this > 980.
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

perl -0pe 's{<meta name="viewport"[^>]*>}{<meta name="viewport" content="width=1000">\n  <!-- AUTO-GENERATED from index.html by sync-mobile.sh - do not edit directly. Edit index.html, then run ./sync-mobile.sh -->}' "$SRC" > "$OUT"

# Sanity check: the swap must have happened exactly once.
if ! grep -q 'content="width=1000"' "$OUT"; then
  echo "error: viewport swap failed - $OUT not written correctly" >&2
  exit 1
fi

echo "OK - wrote $OUT from $SRC ($(wc -l < "$OUT" | tr -d ' ') lines)."
