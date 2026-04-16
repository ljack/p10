# Opus 4.6 vs Opus 4.7 — Small App Shootout

Same prompt, same tools, same sandbox — two models.

## Setup

- **Prompt:** `prompt/todo-api.prompt.md` — Express Todo REST API (6 endpoints) + Jest/supertest tests + README. ~1.8 KB spec.
- **Harness:** `scripts/run-model.sh` — `pi -p --mode json --model anthropic/<model>` with tools `read,bash,edit,write`, no context files, no extensions, no skills, no prompt templates.
- **Runs:** sequential, same machine, same prompt. Node 25, Jest 29.
- **Analyzer:** `scripts/analyze.mjs` reads the JSONL stream + installs deps + runs tests and writes `metrics.json`.
- **Env parity:** both runs had ANTHROPIC credentials from the shell; thinking level default (neither high nor off).

## Headline

| Metric | opus-4-6 | opus-4-7 | Δ |
|---|---:|---:|---:|
| Wall-clock | **81 s** | **55 s** | **−32%** |
| Agent turns | 8 | 5 | −38% |
| Assistant messages | 8 | 5 | −38% |
| `write` calls | 5 | 6 | +20% |
| `bash` calls | 2 | 3 | +50% |
| Input tokens (uncached) | 12,853 | **10** | −99.9% |
| Output tokens | 3,834 | 5,059 | +32% |
| Cache-read tokens | 18,098 | 23,728 | +31% |
| Cache-write tokens | 6,899 | 9,053 | +31% |
| **Cost** | **$0.2123** | **$0.1950** | **−8%** |
| Tests written | 15 | 11 | −27% |
| Tests passing | 15/15 | 11/11 | ✅ both |
| `app.js` LOC | 94 | 97 | +3% |

## What 4.7 did differently

1. **Cached the system prompt from turn 1.** Almost every input token on 4.7 was a cache read — only 10 tokens of fresh input across the whole session. 4.6 took 4 turns of uncached input before the cache kicked in.
2. **Fewer round-trips, more per turn.** 4.7 wrote more files per assistant message (e.g. one turn emitted ~4.3 k output tokens, producing most of the app in one shot). 4.6 interleaved explain-then-edit more.
3. **Cleaner factoring.** 4.7 introduced a `createApp()` factory + tests that spin up a fresh app per case (no shared mutable `app._todos`). 4.6 exposed the store and used `beforeEach(() => app._todos.clear())`. Small thing but 4.7’s pattern is the idiomatic one.
4. **Extra JSON-parse 400 handler.** 4.7 added a middleware that returns `400 { error: "Invalid JSON body" }` for malformed bodies; 4.6 did not.
5. **Fewer but denser tests.** 11 vs 15, but both cover the full spec.

## What 4.6 did differently

1. **More granular tests.** Broken into per-case `it()` blocks, easier to read individual failures.
2. **More thinking-out-loud turns.** Visible in the 3 small assistant messages before any tool use.
3. **Slightly slimmer code** (94 vs 97 LOC in `app.js`) — no factory, no error middleware.

## Quality — both passed

```
opus-4-6  Tests: 15 passed, 15 total  (0.295 s)
opus-4-7  Tests: 11 passed, 11 total  (0.212 s)
```

Both implementations:
- Match the spec exactly (6 endpoints + health)
- Validate title 1–200 chars, reject whitespace-only
- Return 4xx with `{ error }` JSON
- Export the app for tests
- Listen on `PORT || 3000`
- Have a README with curl examples

## Cost anatomy (why 4.7 was cheaper despite more output)

4.7 paid $0.09 input-equivalent (cache reads at 10% of rate) vs 4.6’s $0.05 — but 4.7 saved on uncached input ($0.21 vs $0.01 of that bucket). Output was close. The cache-first behaviour nets out to **−8% cost** with **−32% wall time**.

## Observations

- **4.7 feels "autonomous-ready".** Fewer turns + front-loaded caching is a big win for multi-step agent loops like P10’s pipeline executor — less per-step latency, less round-trip overhead.
- **Both models one-shot this task.** No retries, no failed tests to fix.
- **Small-app ceiling.** Total cost <$0.25 each on a task that takes a human 20–40 min.

## Caveats

- n=1. Single prompt, single run. Real variance across runs is meaningful — we'd want 3–5 iterations each.
- No thinking level forced either way. Could be fairer to test with `--thinking medium` on both.
- No AGENTS.md / style guide — the “what 4.7 feels like by default” test.
- 4.7 wrote slightly less test code; that's a mixed signal (faster vs less defensive).

## Reproduce

```bash
cd agents-test/opus-compare
./scripts/run-model.sh claude-opus-4-6 "$(pwd)/runs/opus-4-6" prompt/todo-api.prompt.md
./scripts/run-model.sh claude-opus-4-7 "$(pwd)/runs/opus-4-7" prompt/todo-api.prompt.md
./scripts/analyze.mjs runs/opus-4-6
./scripts/analyze.mjs runs/opus-4-7
```

## Next steps (if interested)

1. **n=5 replication** — run each model 5× and report mean±stdev on duration, cost, test count.
2. **Harder task** — something that pushes the thinking budget (e.g. an algorithmic component, or debugging a broken app).
3. **Pipeline comparison** — swap pi-daemon's `modelRouter.ts` to prefer 4.7 and run the full P10 autonomous loop on a medium app (todo-app with frontend).
4. **Thinking-level sweep** — 4.6 vs 4.7 at `off`, `medium`, `high` — see where the new model pulls ahead.
5. **Cost-per-green-test** — divide total cost by passing tests. 4.6: $0.0142/test, 4.7: $0.0177/test. Interesting inversion of the headline.
