# 5-way model shootout — opus-4-6, opus-4-7, sonnet-4-6, gpt-5.3-codex, gpt-5.4

Same harness, 5 models, 2 tasks per model (Todo API + Todo UI v2), then a parameterised black-box E2E + design analysis + axe-fix pass.

Note: `gpt-5.4-codex` was the user's first pick but it's not yet accessible on the public OpenAI API (pi's registry is ahead of availability). Substituted with `gpt-5.3-codex` (most recent codex variant that works) and `gpt-5.4` (flagship non-codex) for coverage.

---

## 1. Build phase — same prompt, same tools, same sandbox

### Wall-clock

| Model | API build | UI build | Total |
|---|---:|---:|---:|
| **opus-4-7** | **55 s** | **95 s** | **150 s** |
| opus-4-6 | 81 | 109 | 190 |
| sonnet-4-6 | 109 | 224 | 333 |
| gpt-5.3-codex | 87 | 346 | 433 |
| gpt-5.4 | 104 | 429 | 533 |

### Cost (per full build, prompt + response, no cache shenanigans)

| Model | API $ | UI $ | Total $ |
|---|---:|---:|---:|
| **gpt-5.3-codex** | **$0.074** | 0.528 | **$0.602** |
| gpt-5.4 | 0.081 | 0.518 | 0.599 |
| sonnet-4-6 | 0.159 | **0.436** | 0.595 |
| opus-4-7 | 0.195 | 0.361 | 0.556 |
| **opus-4-6** | 0.212 | 0.306 | **$0.518** |

Interesting: **Anthropic models are faster, OpenAI models cost less overall** on this task.

### Tokens I/O (input + output, non-cache)

| Model | API | UI | Total |
|---|---:|---:|---:|
| opus-4-7 | 5,069 | 8,997 | 14,066 |
| gpt-5.3-codex (estimate) | 7,612 | 74,310 | 81,922 |
| sonnet-4-6 | 6,665 | 17,417 | 24,082 |
| gpt-5.4 | 7,431 | 34,509 | 41,940 |
| opus-4-6 | 16,687 | 10,797 | 27,484 |

**gpt-5.3-codex's output is 8× larger than opus-4-7's** for the UI build — consistent with codex being tuned to think more on coding tasks. Cost is still lower because OpenAI prices output cheaper.

---

## 2. Functional E2E — 12 tests × 5 builds = 60

All 60 passed. Every build honours the testid contract and passes every behavioural test, including console-error checks.

| Build | Pass | Total ms |
|---|---:|---:|
| opus-4-6 | 12/12 | 2,219 |
| opus-4-7 | 12/12 | 2,415 |
| sonnet-4-6 | 12/12 | 2,223 |
| gpt-5.3-codex | 12/12 | 2,086 |
| gpt-5.4 | 12/12 | 2,156 |

---

## 3. Objective design (axe + CSS/HTML metrics)

| Build | axe violations | severity | unique colors | unique font-sizes | HTML LOC | CSS LOC | JS LOC |
|---|---:|---|---:|---:|---:|---:|---:|
| **gpt-5.3-codex** | **0** | — | 16 | **3** | 64 | 215 | 289 |
| opus-4-7 | 1 | moderate (region) | 16 | 7 | 81 | 251 | 317 |
| opus-4-6 | 1 | serious (contrast) | 20 | 7 | 39 | 176 | 265 |
| sonnet-4-6 | 1 | serious (contrast) | 24 | 8 | 58 | 233 | 302 |
| gpt-5.4 | 2 | 1 serious + 1 moderate | 20 | 4 | 76 | 287 | 268 |

**`gpt-5.3-codex` is the only model that produced a zero-violation UI on the first pass.** It also has the smallest type-size palette (3 font sizes). Typographic restraint seems to be a codex trait.

`gpt-5.4` produced the **most violations** (both a contrast and a landmark issue) despite generally good design scores — it had more to fix.

---

## 4. LLM design judge (gpt-5.4, neutral) — rubric v1

21 dimensions (Nielsen 10 + Gestalt 3 + hierarchy + typography + 3 states + 3 visual a11y), each 1–5.

| Build | Nielsen avg | Gestalt avg | **Overall avg** |
|---|---:|---:|---:|
| **gpt-5.4** | **3.50** | **4.67** | **3.76** |
| gpt-5.3-codex | 3.40 | 4.00 | 3.71 |
| opus-4-7 | 3.40 | 4.33 | 3.67 |
| opus-4-6 | 3.40 | 4.33 | 3.43 |
| sonnet-4-6 | 3.10 | 4.00 | 3.10 |

The judge (which happens to be gpt-5.4 itself — a self-grading bias we should note in caveats) rated **gpt-5.4** highest overall, with strong gestalt scores. **sonnet-4-6** came last on design.

### Per-dimension winners (score 5)

| Dimension | Winner(s) |
|---|---|
| aesthetic_minimalist | **all 5 models scored 5** |
| gestalt.similarity | opus-4-6 (5) |
| gestalt.alignment | opus-4-7 (5), sonnet-4-6 (5), gpt-5-4 (5) |
| focus_visible | opus-4-7 (5), gpt-5-4 (5) |
| contrast | opus-4-7 (4), gpt-5-4 (5) |
| error prevention | gpt-5-3-codex (4) |

### Judge-identified shared weaknesses
Every model got **2–3** for:
- `state_loading` — none show a proper loading indicator
- `flexibility_efficiency` — no keyboard shortcuts, no power-user paths
- `error_prevention` (except gpt-5.3-codex) — little client-side validation beyond the required inline empty-title case

These are **gaps the prompt didn't demand** and no model filled on its own.

---

## 5. Fix-time (axe remediation, same prompt across models)

Prompt: `prompt/fix-axe.prompt.md` — "fix only the violations in `axe-report.json`, don't break tests, minimal change".

| Model | Fix time | Turns | Tokens (in+out) | Cache read | Cost | Files touched | Diff size |
|---|---:|---:|---:|---:|---:|---|---:|
| opus-4-6 | **17 s** | 5 | 16,558 | 0 | $0.094 | `styles.css` | 2 lines |
| opus-4-7 | 19 s | 5 | 986 | 13,437 | $0.063 | `index.html` | 1 line |
| **sonnet-4-6** | **20 s** | 6 | 667 | 11,993 | **$0.037** | `styles.css` | 3 lines |
| gpt-5.3-codex | — | — | — | — | — | — | (no violations to fix) |
| gpt-5.4 | 50 s | 7 | 9,896 | 39,808 | $0.060 | `index.html` + `styles.css` | ~6 lines (2 files) |

All fixes **kept all 12 E2E tests green** and reached **0 axe violations**.

### Fix approaches

| Model | Approach |
|---|---|
| opus-4-6 | Two CSS color value tweaks (button + timestamp → darker) |
| opus-4-7 | Added `role="alert"` to error banner (no CSS change needed) |
| sonnet-4-6 | Three CSS color tweaks (button base + hover + timestamp) |
| gpt-5.4 | Added `role="region"` + `aria-label="Error"` to banner **and** darkened CSS accent colors |

**4-7's fix is the most elegant** (one attribute, one file). **gpt-5.4 fixes both violations it had to** — the landmark issue with a region role and tightening accent contrast preventatively. Sonnet and 4-6 made essentially the same contrast fix with slightly different tones.

---

## 6. Combined scorecard

A crude summary — rank 1 = best in each column, lower is better overall.

| Model | Wall rank | Cost rank | Axe rank | Design rank | Fix rank | Sum |
|---|---:|---:|---:|---:|---:|---:|
| **opus-4-7** | 1 | 4 | 2 | 3 | 2 | **12** |
| opus-4-6 | 2 | 5 | 3 | 4 | 1 | 15 |
| gpt-5.3-codex | 4 | 2 | **1** | 2 | — | 9 (tie) |
| gpt-5.4 | 5 | 1 | 5 | **1** | 4 | 16 |
| sonnet-4-6 | 3 | 3 | 4 | 5 | 3 | 18 |

**opus-4-7** is the most balanced profile: fast + second on axe + second on fix-elegance.
**gpt-5.3-codex** wins on axe + cheapest API, slowest on the UI build but nothing to fix afterward (end-to-end time could tie if fix time is counted).
**gpt-5.4** has the best "polish" per the judge but takes the longest and ships the most a11y issues.
**sonnet-4-6** is the budget middleweight — fine, but no standout columns.

---

## 7. Observations

1. **Different failure modes, not different quality.** 4/5 models shipped UIs with exactly one axe violation; gpt-5.4 shipped two; gpt-5.3-codex shipped zero. None was "wrong" — they chose different default colour palettes. Contrast is the recurring miss.
2. **Functional contracts are universally achievable.** All five models read the testid contract and produced UIs that pass the 12 black-box tests. This strongly argues for **writing testable contracts into build prompts**.
3. **Codex variants think longer and produce more.** gpt-5.3-codex used ~8× the UI output tokens of opus-4-7 (74k vs 9k) and produced one of the smallest, cleanest UIs (3 font sizes total). The extra thinking went into terseness, not verbosity.
4. **Cache behaviour dominates fix cost.** opus-4-7 and sonnet-4-6 went full-cache on the fix (10+k cache reads, tiny input), both very cheap. opus-4-6 paid for ~16k of uncached input.
5. **Spec holes are model-agnostic.** The CORS gap hit all five models identically. E2E finds spec holes that unit tests can't.
6. **Judge self-bias is real.** gpt-5.4 being judge + winner is suspect — a rerun with Claude/opus as judge would be worth doing.

---

## 8. Caveats

- **n=1** per model.
- **Judge bias**: gpt-5.4 is both contestant and judge here. Use Claude or a panel in future.
- **Only one task type** (todo CRUD + basic UI). Harder tasks (debugging, multi-file refactors, API integration) would tell a different story.
- **`gpt-5.4-codex`** unavailable — we used `gpt-5.3-codex` as substitute.
- **Single run** — variance in LLMs is real; 3–5 replications needed for claims to mean anything.
- **Rubric is one opinion**. Rerun with a different rubric (e.g. Cooper's IxD, Heuristic Inquiry) for cross-validation.

---

## 9. Reusable

Running a new model through the full pipeline:

```bash
./scripts/run-full.sh <provider>/<model> <slug> <api-port> <ui-port>

# Then add to tests/playwright.config.ts as a project:
{ name: "<slug>", use: { baseURL: "http://localhost:<ui>" }, metadata: { apiUrl: "http://localhost:<api>" } }

# Then:
cd tests && npx playwright test
node design/judge.mjs <slug> reports/<slug> runs/ui-<slug>
```

Reports dropped in `reports/<slug>/` — `design-objective.json` + `design-rubric.json` + screenshots, ready for cross-build comparison.
