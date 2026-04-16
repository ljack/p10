#!/bin/bash
# Harness runner: Antigravity (agy)
# Usage: ./agy.sh <run_dir> <prompt_file>
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

# Run Antigravity in agent chat mode
# agy chat runs in terminal mode with --mode agent
agy chat --mode agent "$FULL_PROMPT" \
  2>&1 | tee "$RUN_DIR/harness.log"

echo "EXIT:$?" >> "$RUN_DIR/harness.log"
