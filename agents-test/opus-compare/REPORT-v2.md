# Opus 4.6 vs Opus 4.7 — Round 2: UI build + E2E + Design + Fix

Same prompt → same UI → two models. Tested end-to-end with Playwright, analysed with axe-core + an LLM design judge (gpt-5.4), then asked each model to fix its own a11y violation.

## 1. Build phase (same prompt, fresh repo each)

Prompt: `prompt/todo-ui-v2.prompt.md` — static HTML/CSS/JS UI + Node `http` server + testability contract (data-testid + aria-labels). Both builds ran via `scripts/run-model.sh` with `--no-context-files --no-extensions --no-skills`.

| Metric | opus-4-6 | opus-4-7 |
|---|---:|---:|
| Wall-clock | **109 s** | **95 s** |
| Stray processes left behind | 0 | 0 |
| Files produced | 5 | 5 |
| `add-error` handling | static in HTML | created in JS |
| Other testid contract compliance | ✅ all | ✅ all |

Both honoured the self-test discipline (prompt explicitly banned `&` / `nohup`). Round 1 round-2 comparison: 4-7 was 32% faster on a simpler task; 13% faster here.

## 2. Baseline gap discovered: CORS

E2E tests exposed a real spec hole: neither API (from round 1) set CORS headers, so the browser UI couldn't call them cross-port. **Both models shipped the same bug** because the original API prompt didn't mention CORS.

**Verdict-0**: 0/12 tests pass on either build.

**Identical infrastructure patch** applied to both APIs (`scripts/patch-cors.sh` — a 6-line middleware) — fair fix, same code drop to both.

**Verdict-1**: **12/12 tests pass on both builds.** Total test wall-clock: 4-6 = 1.94 s, 4-7 = 2.38 s.

## 3. Functional E2E results — 12 tests each build

| Test | 4-6 | 4-7 |
|---|:-:|:-:|
| health dot reflects API up | ✅ | ✅ |
| empty state with 0 todos | ✅ | ✅ |
| add valid todo | ✅ | ✅ |
| empty title → inline error, no POST | ✅ | ✅ |
| toggle completed + data-completed attr | ✅ | ✅ |
| inline edit saves on Enter | ✅ | ✅ |
| inline edit cancels on Escape | ✅ | ✅ |
| delete removes from DOM | ✅ | ✅ |
| sort: newest first | ✅ | ✅ |
| api base persists across reload | ✅ | ✅ |
| relative time renders | ✅ | ✅ |
| no console errors | ✅ | ✅ |
| **Total** | **12/12** | **12/12** |

Both are functionally correct. Run with `cd tests && npx playwright test`.

## 4. Objective design signals (deterministic — axe + CSS/HTML)

| Metric | 4-6 | 4-7 |
|---|---:|---:|
| axe violations | **1 serious** (color-contrast, 3 nodes) | **1 moderate** (region, 1 node) |
| axe incomplete | 1 | 1 |
| unique colors (CSS) | 18 | 16 |
| unique font-sizes | 7 | 7 |
| unique spacings | 27 | 34 |
| `!important` uses | 0 | 0 |
| CSS size | ~3.5 KB | ~4.2 KB |
| HTML size | 2.2 KB | 2.7 KB |
| JS size | ~570 KB incl. jsdom-free axe | (same) |
| Landmarks (main/header) | `<main>` ✅, `<header>` ✅ | `<main>` ✅, `<header>` ✅ |
| Inputs with labels | ✅ all | ✅ all |
| Image alts | n/a (no `<img>`) | n/a |
| html lang attribute | ✅ | ✅ |

**Different flavours of a11y miss:**
- 4-6: `#add-submit` white-on-`#4a90d9` = 3.34:1 (needs 4.5); `.todo-time` `#999 on white` = 2.84:1.
- 4-7: error banner content not inside a landmark region.

## 5. LLM design judge (gpt-5.4, neutral) — rubric v1

Rubric covers **Nielsen 10 + Gestalt 3 + hierarchy / typography / states / a11y perception** = 21 dimensions, each 1–5.

| Bucket | 4-6 avg | 4-7 avg |
|---|---:|---:|
| Nielsen 10 | 3.40 | 3.40 |
| Gestalt 3 | 4.33 | 4.33 |
| **Overall (21 dims)** | **3.43** | **3.67** |

### Dimensions where they differ

| Dimension | 4-6 | 4-7 | Winner |
|---|---:|---:|---|
| nielsen.help_users_with_errors | 3 | **4** | 4-7 |
| nielsen.user_control_freedom | 3 | 2 | 4-6 |
| gestalt.similarity | 5 | 4 | 4-6 |
| gestalt.alignment | 4 | 5 | 4-7 |
| typography | 3 | **4** | 4-7 |
| contrast | 2 | **4** | 4-7 |
| touch_targets | 2 | 3 | 4-7 |
| focus_visible | 4 | **5** | 4-7 |

**Judge's summary — 4-6 (full text):**
> Opus-4-6 delivers a clean, focused todo UI with strong alignment, consistent card styling, and an obvious primary action. … Its main weaknesses are in feedback and resilience: loading is only lightly indicated, system health relies on a small unlabeled status dot, and preventive validation or undo paths are limited. Visual accessibility also needs attention because secondary gray text and small controls contribute to confirmed contrast and target-size concerns.

**Judge's summary — 4-7 (full text):**
> This build presents a clean, restrained single-column todo interface with strong alignment, sensible hierarchy, and consistent component styling. … A prominent error banner and API health indicator communicate failures quickly, and focus treatments are clearly defined across key controls. However, loading feedback, error prevention, and power-user efficiency are weak.

Judge identified the same **strengths both ways** (alignment, restraint, clear hierarchy) and the same **shared weaknesses** (loading feedback, no undo/shortcuts, limited error prevention). **4-7 edges ahead on visual accessibility** (contrast, focus rings, touch targets).

## 6. Fix task — time-to-remediate the single axe violation

Same prompt, each model, each asked to fix only its own violation without breaking tests or contracts.

Prompt: `prompt/fix-axe.prompt.md`. Model gets `axe-report.json` in its cwd.

| Metric | 4-6 | 4-7 |
|---|---:|---:|
| Wall-clock | **17 s** | 19 s |
| Turns | 5 | 5 |
| Tools used | 3 read, 1 bash, 1 edit | 2 read, 1 bash, 1 edit |
| Input tokens (uncached) | 15,997 | **10** |
| Output tokens | 561 | 976 |
| Cache read | 0 | 13,437 |
| Cache write | 0 | 5,008 |
| **Cost** | $0.0940 | **$0.0625** |
| Files touched | `styles.css` | `index.html` |
| Diff size | 2 lines (color changes) | 1 line (`role="alert"`) |
| E2E tests still green after fix | 12/12 | 12/12 |
| Axe violations post-fix | **0** | **0** |

### Fix diffs

**4-6 (`styles.css`):**
```diff
-  background: #4a90d9;   /* button */
+  background: #2b6cb0;
-  color: #999;           /* .todo-time */
+  color: #595959;
```
Minimal, targeted, each change lifts contrast to ≥4.5:1.

**4-7 (`index.html`):**
```diff
   class="error-banner"
   data-testid="error-banner"
   id="error-banner"
+  role="alert"
```
Single attribute turns the banner into an implicit landmark region — solves the axe rule without wrapping content.

Both approaches are idiomatic and minimal. 4-7 found the smallest possible fix (a11y elegance); 4-6 did the straightforward CSS remediation.

## 7. Wall-clock + cost summary (build + fix)

| Phase | 4-6 | 4-7 |
|---|---:|---:|
| Build | 109 s | 95 s |
| Fix | 17 s | 19 s |
| **Total wall-clock** | **126 s** | **114 s** |
| Build cost | (see round 1 shape ~ $0.20) | ~$0.20 |
| Fix cost | $0.0940 | $0.0625 |

## 8. What this round taught us

1. **Functional parity is achievable.** With a testable-markers contract in the prompt, both models produce UIs that pass 12 black-box tests identically.
2. **Prompt gaps are visible through E2E.** The CORS hole was invisible at unit-test level and obvious at E2E level — good argument for E2E early.
3. **Design delta is subtle but real.** Axe objectively caught different failure modes for each model (contrast vs landmarks). Judge gave 4-7 a +0.24 overall edge, concentrated in visual-a11y dimensions (contrast, focus, touch targets).
4. **Fix behaviour mirrors build behaviour.** 4-7 stays cache-heavy and cheaper; 4-6 does more uncached reads but writes tighter output. Both fixes minimal.
5. **Neither model one-shot accessible design.** Each produced exactly one axe violation in initial build — different flaws, each easily fixed.

## 9. Reusable harness

```
agents-test/opus-compare/
├── prompt/
│   ├── todo-api.prompt.md
│   ├── todo-ui-v2.prompt.md
│   └── fix-axe.prompt.md
├── scripts/
│   ├── run-model.sh         # model → run dir
│   ├── run-fix.sh           # fix task timing
│   ├── patch-cors.sh        # shared baseline patch
│   └── analyze.mjs          # stream → metrics
├── tests/
│   ├── playwright.config.ts # parameterised (per-build project)
│   └── e2e.spec.ts          # 12 tests, build-agnostic via testid contract
├── design/
│   ├── rubric.md            # Nielsen 10 + Gestalt + states + visual a11y
│   ├── analyze.mjs          # axe + CSS/HTML metrics
│   └── judge.mjs            # LLM rubric scoring (gpt-5.4)
└── reports/
    ├── e2e-results.json
    ├── opus-4-{6,7}/design-objective.json
    ├── opus-4-{6,7}/design-rubric.json
    ├── opus-4-{6,7}/screenshot-{empty,populated}.png
    └── opus-4-{6,7}-postfix/design-objective.json
```

To run against a new model: `scripts/run-model.sh <model> <new-run-dir> prompt/todo-ui-v2.prompt.md` then add a project to `playwright.config.ts` and run `design/analyze.mjs` + `design/judge.mjs`.

## 10. Caveats still standing

- **n=1** everywhere.
- Judge uses a single LLM call; variance unmeasured.
- Design rubric is one opinion — reasonable but not canonical.
- No mobile viewport tested.
- No performance (TTFB, FCP) metrics.
- Fix prompt was extremely constrained — single violation, no breakage. Real-world remediation has more ambiguity.
