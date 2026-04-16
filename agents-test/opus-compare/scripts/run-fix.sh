#!/usr/bin/env bash
# Run a follow-up fix task on an existing build, with timing.
# Usage: ./run-fix.sh <model> <run-dir> <prompt-file> <out-stream>
set -eu
MODEL="$1"
RUN_DIR="$2"
PROMPT_FILE="$3"
OUT_STREAM="$4"

PROMPT=$(cat "$PROMPT_FILE")
cd "$RUN_DIR"

if [[ "$MODEL" == */* ]]; then
  MODEL_ARG="$MODEL"
else
  MODEL_ARG="anthropic/$MODEL"
fi

START=$(date +%s)
pi -p \
  --mode json \
  --model "$MODEL_ARG" \
  --no-context-files --no-extensions --no-skills --no-prompt-templates \
  --tools read,bash,edit,write \
  --session-dir "$RUN_DIR/fix-session" \
  "$PROMPT" \
  >"$OUT_STREAM" 2>>"$RUN_DIR/stderr.log" || true
END=$(date +%s)

echo "=== Fix done: model=$MODEL duration=$((END-START))s ==="
