#!/bin/bash
# Setup run directories for harness comparison test
# Creates: runs/{harness}-{app}-{variant}/
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
RUNS_DIR="$SCRIPT_DIR/runs"
VARIANTS_DIR="$SCRIPT_DIR/variants"

echo "=== Setting up harness comparison runs ==="

HARNESSES="claude-code pi codex gemini agy"
APPS="vet elec"
VARIANT="A"  # Control variant only for harness comparison

# We can also pass variants as arg
if [ -n "$1" ]; then
  VARIANT="$1"
fi

get_variant_file() {
  case "$1" in
    B) echo "B-speed-AGENTS.md" ;;
    C) echo "C-quality-AGENTS.md" ;;
    D) echo "D-tdd-AGENTS.md" ;;
    E) echo "E-adversarial-AGENTS.md" ;;
  esac
}

count=0
for harness in $HARNESSES; do
  for app in $APPS; do
    dir="$RUNS_DIR/${harness}-${app}-${VARIANT}"
    
    # Skip if already exists and has content
    if [ -d "$dir/backend" ] || [ -d "$dir/frontend" ]; then
      echo "SKIP $dir (already has content)"
      continue
    fi
    
    echo "Creating $dir ..."
    mkdir -p "$dir"
    
    # Copy AGENTS.md if variant has one
    if [ "$VARIANT" != "A" ]; then
      vfile=$(get_variant_file "$VARIANT")
      cp "$VARIANTS_DIR/$vfile" "$dir/AGENTS.md"
      echo "  → copied AGENTS.md (variant $VARIANT)"
    else
      echo "  → no AGENTS.md (control)"
    fi
    
    # Tag with harness metadata
    echo "{\"harness\":\"$harness\",\"app\":\"$app\",\"variant\":\"$VARIANT\"}" > "$dir/run-meta.json"
    count=$((count + 1))
  done
done

echo ""
echo "=== Setup complete: $count new run directories ==="
echo "Harnesses: $HARNESSES"
echo "Apps: $APPS"
echo "Variant: $VARIANT"
echo ""
echo "Next: run each harness with its corresponding script"
echo "  ./harnesses/claude-code.sh runs/claude-code-vet-A specs/vet-app.prompt.md"
echo "  etc."
