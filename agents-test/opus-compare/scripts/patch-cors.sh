#!/usr/bin/env bash
# Identical CORS patch applied to both baseline APIs.
# Prepends a permissive CORS middleware before the first real route.
set -eu

for dir in runs/opus-4-6 runs/opus-4-7; do
  f="$dir/src/app.js"
  if grep -q 'x-p10-cors-patch' "$f"; then
    echo "skip $f (already patched)"
    continue
  fi

  # Insert after `app.use(express.json());`
  python3 - "$f" <<'PY'
import sys, pathlib
p = pathlib.Path(sys.argv[1])
src = p.read_text()
marker = "app.use(express.json());"
patch = """

// x-p10-cors-patch — identical to both baselines so a browser UI can call us
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  next();
});
"""
if marker not in src:
  print(f"ERROR: marker not found in {p}", file=sys.stderr)
  sys.exit(1)
p.write_text(src.replace(marker, marker + patch, 1))
print(f"patched {p}")
PY
done
