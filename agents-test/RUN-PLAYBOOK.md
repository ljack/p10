# Execution Playbook

## Step 1: Setup directories
```bash
cd agents-test && ./setup-runs.sh
```

## Step 2: Build all apps (from pi)

### Batch 1 — Vet app (5 variants in parallel)
```
subagent parallel:
  - agent: builder, cwd: runs/vet-A, task: <vet-app.prompt.md contents>
  - agent: builder, cwd: runs/vet-B, task: <vet-app.prompt.md contents>
  - agent: builder, cwd: runs/vet-C, task: <vet-app.prompt.md contents>
  - agent: builder, cwd: runs/vet-D, task: <vet-app.prompt.md contents>
  - agent: builder, cwd: runs/vet-E, task: <vet-app.prompt.md contents>
```

### Batch 2 — Electricity app (5 variants in parallel)
```
subagent parallel:
  - agent: builder, cwd: runs/elec-A, task: <electricity-app.prompt.md contents>
  - agent: builder, cwd: runs/elec-B, task: <electricity-app.prompt.md contents>
  - agent: builder, cwd: runs/elec-C, task: <electricity-app.prompt.md contents>
  - agent: builder, cwd: runs/elec-D, task: <electricity-app.prompt.md contents>
  - agent: builder, cwd: runs/elec-E, task: <electricity-app.prompt.md contents>
```

## Step 3: Score all builds (sequential — each needs to start/stop servers)
```
For each run in [vet-A, vet-B, ..., elec-D, elec-E]:
  subagent single:
    - agent: scorer, cwd: runs/{run_id}, task: "Score run {run_id}. Rubric at ../../scoring/rubric.md, spec at ../../specs/{app}.prompt.md"
```

Use incrementing ports: vet-A=18001, vet-B=18002, ..., elec-E=18010

## Step 4: Aggregate results
```bash
# Collect all score.json files
for f in agents-test/runs/*/score.json; do echo "--- $(dirname $f | xargs basename) ---"; cat "$f" | python3 -m json.tool | grep -E '"(total|run_id)"'; done
```

Or use the report-generator to build a comparison matrix.

## Expected Timeline
- Setup: 1 minute
- Build batch 1 (vet × 5): ~10-15 minutes
- Build batch 2 (elec × 5): ~10-15 minutes
- Scoring (10 runs): ~20-30 minutes
- Total: ~45-60 minutes

## Troubleshooting
- If a build hangs: check the run directory for partial output
- If scoring fails to start a server: check if port is in use (`lsof -i :18001`)
- Rate limits: reduce parallelism to 3 at a time
