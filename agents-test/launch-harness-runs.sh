#!/bin/bash
# Launch all harness runs. Runs harnesses sequentially (each gets full resources),
# but both apps for the same harness can run in parallel.
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
RUNS_DIR="$SCRIPT_DIR/runs"
HARNESSES_DIR="$SCRIPT_DIR/harnesses"
SPECS_DIR="$SCRIPT_DIR/specs"

HARNESSES="claude-code pi codex gemini agy"
APPS="vet elec"
VARIANT="${1:-A}"

# Map app names to spec files
get_spec() {
  case "$1" in
    vet) echo "$SPECS_DIR/vet-app.prompt.md" ;;
    elec) echo "$SPECS_DIR/electricity-app.prompt.md" ;;
  esac
}

echo "============================================="
echo "  AGENTS.md Impact Test — Harness Comparison"
echo "  Variant: $VARIANT"
echo "  $(date)"
echo "============================================="
echo ""

for harness in $HARNESSES; do
  echo ""
  echo "##############################################"
  echo "# HARNESS: $harness"
  echo "##############################################"
  
  PIDS=""
  for app in $APPS; do
    run_dir="$RUNS_DIR/${harness}-${app}-${VARIANT}"
    spec=$(get_spec "$app")
    harness_script="$HARNESSES_DIR/${harness}.sh"
    
    if [ ! -d "$run_dir" ]; then
      echo "  SKIP $run_dir (not found)"
      continue
    fi
    
    # Skip if already built
    if [ -d "$run_dir/backend" ] || [ -d "$run_dir/frontend" ]; then
      echo "  SKIP ${harness}-${app}-${VARIANT} (already built)"
      continue
    fi
    
    echo "  STARTING ${harness}-${app}-${VARIANT} ..."
    
    # Run in background, capture start time
    START_TIME=$(date +%s)
    (
      "$harness_script" "$run_dir" "$spec" > "$run_dir/harness.log" 2>&1
      END_TIME=$(date +%s)
      ELAPSED=$((END_TIME - START_TIME))
      echo "{\"elapsed_seconds\": $ELAPSED, \"exit_code\": $?}" > "$run_dir/timing.json"
      echo "  DONE ${harness}-${app}-${VARIANT} in ${ELAPSED}s"
    ) &
    PIDS="$PIDS $!"
  done
  
  # Wait for both apps of this harness to complete
  if [ -n "$PIDS" ]; then
    echo "  Waiting for $harness to finish both apps..."
    for pid in $PIDS; do
      wait $pid 2>/dev/null || echo "  WARNING: PID $pid exited non-zero"
    done
  fi
  
  echo "  $harness: COMPLETE"
done

echo ""
echo "============================================="
echo "  ALL HARNESS RUNS COMPLETE"
echo "  $(date)"
echo "============================================="
echo ""
echo "Next: run scoring with score-run.sh on each"
