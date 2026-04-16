#!/usr/bin/env bash
# End-to-end harness for one model.
# Usage: ./run-full.sh <model-spec> <build-slug> <api-port> <ui-port>
# Example: ./run-full.sh openai/gpt-5.4-codex gpt-5-4-codex 4141 9191
set -eu

MODEL="$1"
SLUG="$2"
API_PORT="$3"
UI_PORT="$4"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
API_DIR="$ROOT/runs/api-$SLUG"
UI_DIR="$ROOT/runs/ui-$SLUG"

echo "===================================================================="
echo "Model:      $MODEL"
echo "Slug:       $SLUG"
echo "API port:   $API_PORT    UI port: $UI_PORT"
echo "API dir:    $API_DIR"
echo "UI dir:     $UI_DIR"
echo "===================================================================="

# -- API build --
if [ -d "$API_DIR/src" ] && [ -f "$API_DIR/src/app.js" ]; then
  echo "[skip] API already built at $API_DIR"
else
  echo "[build] API"
  "$ROOT/scripts/run-model.sh" "$MODEL" "$API_DIR" "$ROOT/prompt/todo-api.prompt.md"
  echo "[install] API deps"
  (cd "$API_DIR" && npm install --silent --no-audit --no-fund)
fi

# -- CORS patch --
if grep -q 'x-p10-cors-patch' "$API_DIR/src/app.js" 2>/dev/null; then
  echo "[skip] CORS already patched"
else
  echo "[patch] CORS on API"
  python3 - "$API_DIR/src/app.js" <<'PY'
import sys, pathlib
p = pathlib.Path(sys.argv[1])
src = p.read_text()
marker = "app.use(express.json());"
patch = """

// x-p10-cors-patch — identical shared CORS middleware for browser tests
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  next();
});
"""
if marker not in src:
  sys.exit("marker not found in " + str(p))
p.write_text(src.replace(marker, marker + patch, 1))
print("patched", p)
PY
fi

# -- UI build --
if [ -f "$UI_DIR/index.html" ] && [ -f "$UI_DIR/app.js" ]; then
  echo "[skip] UI already built at $UI_DIR"
else
  echo "[build] UI"
  "$ROOT/scripts/run-model.sh" "$MODEL" "$UI_DIR" "$ROOT/prompt/todo-ui-v2.prompt.md"
fi

# -- Start servers --
echo "[start] API :$API_PORT"
pkill -f "node $API_DIR/src/server.js" 2>/dev/null || true
(cd "$API_DIR" && PORT=$API_PORT nohup node src/server.js >server.log 2>&1 &)
sleep 0.8

echo "[start] UI :$UI_PORT"
pkill -f "node $UI_DIR/server.js" 2>/dev/null || true
(cd "$UI_DIR" && PORT=$UI_PORT nohup node server.js >server.log 2>&1 &)
sleep 0.8

echo "[smoke]"
printf "  api:%s  " $API_PORT; curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:$API_PORT/health" || true
printf "  ui :%s  " $UI_PORT;  curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:$UI_PORT/" || true

# -- Design analyzer (axe + CSS metrics + screenshots) --
REPORT_DIR="$ROOT/reports/$SLUG"
mkdir -p "$REPORT_DIR"
echo "[analyze] design"
node "$ROOT/design/analyze.mjs" "$SLUG" "http://localhost:$UI_PORT" "http://localhost:$API_PORT" "$REPORT_DIR"

# -- E2E is run separately via Playwright (config adds one project per build) --
echo "===================================================================="
echo "DONE: $SLUG"
echo "  API:    http://localhost:$API_PORT"
echo "  UI:     http://localhost:$UI_PORT"
echo "  Report: $REPORT_DIR"
echo "Next: add project to tests/playwright.config.ts and rerun E2E."
echo "===================================================================="
