#!/bin/bash
# Harness runner: Claude Code
# Usage: ./claude-code.sh <run_dir> <prompt_file>
set -e

RUN_DIR="$1"
PROMPT_FILE="$2"
PROMPT=$(cat "$PROMPT_FILE")

# If AGENTS.md exists, prepend instruction to read it
AGENTS_PREFIX=""
if [ -f "$RUN_DIR/AGENTS.md" ]; then
  AGENTS_PREFIX="FIRST read the AGENTS.md file in the current directory and follow its instructions throughout the build.

"
fi

FULL_PROMPT="${AGENTS_PREFIX}IMPORTANT: Work in the CURRENT DIRECTORY. Create backend/ and frontend/ subdirectories here.

${PROMPT}"

cd "$RUN_DIR"

# Run Claude Code in non-interactive print mode with full tool access
claude -p "$FULL_PROMPT" \
  --allowedTools "Bash Edit Write Read" \
  --dangerously-skip-permissions \
  --max-budget-usd 5 \
  2>&1 | tee "$RUN_DIR/harness.log"

echo "EXIT:$?" >> "$RUN_DIR/harness.log"
