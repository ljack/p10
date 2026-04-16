#!/usr/bin/env bash
# Run the todo-api prompt with a specific model, capture timings + JSON stream.
# Usage: ./run-model.sh <model-id> <run-dir> <prompt-file>
set -eu

MODEL="$1"
RUN_DIR="$2"
PROMPT_FILE="$3"

mkdir -p "$RUN_DIR"
PROMPT=$(cat "$PROMPT_FILE")

cd "$RUN_DIR"
echo "=== Starting run for model: $MODEL ==="
echo "=== cwd: $(pwd) ==="

START_EPOCH=$(date +%s)
START_ISO=$(date -u +%Y-%m-%dT%H:%M:%SZ)

# Run pi in JSON streaming mode, no prior context files, opus with high thinking off to keep comparable
pi -p \
  --mode json \
  --model "anthropic/$MODEL" \
  --no-context-files \
  --no-extensions \
  --no-skills \
  --no-prompt-templates \
  --tools read,bash,edit,write \
  --session-dir "$RUN_DIR/session" \
  "$PROMPT" \
  >"$RUN_DIR/stream.jsonl" 2>"$RUN_DIR/stderr.log" || echo "pi exited $?" >>"$RUN_DIR/stderr.log"

END_EPOCH=$(date +%s)
END_ISO=$(date -u +%Y-%m-%dT%H:%M:%SZ)
DURATION=$((END_EPOCH - START_EPOCH))

cat >"$RUN_DIR/run-meta.json" <<JSON
{
  "model": "$MODEL",
  "started": "$START_ISO",
  "ended": "$END_ISO",
  "durationSec": $DURATION,
  "prompt": "$(basename "$PROMPT_FILE")",
  "cwd": "$(pwd)"
}
JSON

echo "=== Done: model=$MODEL duration=${DURATION}s ==="
