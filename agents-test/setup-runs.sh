#!/bin/bash
# Setup isolated run directories for AGENTS.md impact test
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
RUNS_DIR="$SCRIPT_DIR/runs"
VARIANTS_DIR="$SCRIPT_DIR/variants"

echo "=== Setting up test run directories ==="

# Clean previous runs
if [ -d "$RUNS_DIR" ]; then
  echo "Removing previous runs..."
  rm -rf "$RUNS_DIR"
fi

mkdir -p "$RUNS_DIR"

APPS="vet elec"
VARIANTS="A B C D E"

get_variant_file() {
  case "$1" in
    B) echo "B-speed-AGENTS.md" ;;
    C) echo "C-quality-AGENTS.md" ;;
    D) echo "D-tdd-AGENTS.md" ;;
    E) echo "E-adversarial-AGENTS.md" ;;
  esac
}

for app in $APPS; do
  for variant in $VARIANTS; do
    dir="$RUNS_DIR/${app}-${variant}"
    echo "Creating $dir ..."
    mkdir -p "$dir"

    # Copy AGENTS.md if variant has one
    if [ "$variant" != "A" ]; then
      vfile=$(get_variant_file "$variant")
      cp "$VARIANTS_DIR/$vfile" "$dir/AGENTS.md"
      echo "  → copied AGENTS.md (variant $variant)"
    else
      echo "  → no AGENTS.md (control)"
    fi
  done
done

echo ""
echo "=== Setup complete ==="
echo "Created $(ls -d "$RUNS_DIR"/*/ | wc -l | tr -d ' ') run directories:"
ls -1d "$RUNS_DIR"/*/
echo ""
echo "Next: launch builds from pi using subagent parallel tasks"
