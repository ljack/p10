# Design Rubric v1

Used by a neutral LLM judge (not 4.6 / 4.7) to score a built UI on established design principles. The schema is strict so scores are comparable across builds.

## Scales
- **score**: integer 1..5
  - 1 = violated / absent
  - 2 = poor
  - 3 = acceptable
  - 4 = good
  - 5 = exemplary
- **confidence**: 0..1 — how sure the judge is given available evidence
- **evidence**: ≤3 short quotes or selectors from the DOM/CSS that justify the score

## Dimensions

### A. Nielsen's 10 Usability Heuristics (NN/g)
1. `visibility_of_system_status` — Does the UI keep users informed (loading, health, busy)?
2. `match_with_real_world` — Plain language, familiar conventions?
3. `user_control_freedom` — Undo/cancel/escape available?
4. `consistency_standards` — Internal + external consistency (form patterns, button styles)?
5. `error_prevention` — Prevents invalid actions (e.g. empty title) before they happen?
6. `recognition_over_recall` — Labels, hints, visible options?
7. `flexibility_efficiency` — Keyboard shortcuts, power-user paths?
8. `aesthetic_minimalist` — No unnecessary info; visual restraint?
9. `help_users_with_errors` — Errors are clear, actionable, well-placed?
10. `help_and_documentation` — Inline hints, placeholder, empty state copy?

### B. Gestalt Principles
1. `proximity` — Related items grouped by whitespace?
2. `similarity` — Repeating elements look alike?
3. `alignment` — Edges line up; clear grid?

### C. Visual hierarchy & typography
- `hierarchy` — Clear primary/secondary emphasis
- `typography` — Appropriate sizes, line-heights, limited font count

### D. Feedback & states
- `state_loading` — Loading/busy state visible
- `state_empty` — Empty state with guidance
- `state_error` — Error state obvious, recoverable

### E. Accessibility perception (visual only; DOM a11y separately)
- `contrast` — Text contrast appears sufficient
- `touch_targets` — Clickable areas look ≥24px
- `focus_visible` — Focus rings present on interactive elements

## Output schema

The judge MUST output a single JSON object (no prose) matching:

```json
{
  "build": "<string>",
  "rubric_version": "1",
  "scores": {
    "nielsen": {
      "visibility_of_system_status": { "score": 1, "confidence": 0.9, "evidence": ["..."] },
      "match_with_real_world": { "...": "..." },
      "user_control_freedom": { "...": "..." },
      "consistency_standards": { "...": "..." },
      "error_prevention": { "...": "..." },
      "recognition_over_recall": { "...": "..." },
      "flexibility_efficiency": { "...": "..." },
      "aesthetic_minimalist": { "...": "..." },
      "help_users_with_errors": { "...": "..." },
      "help_and_documentation": { "...": "..." }
    },
    "gestalt": {
      "proximity": { "...": "..." },
      "similarity": { "...": "..." },
      "alignment": { "...": "..." }
    },
    "hierarchy": { "...": "..." },
    "typography": { "...": "..." },
    "state_loading": { "...": "..." },
    "state_empty": { "...": "..." },
    "state_error": { "...": "..." },
    "contrast": { "...": "..." },
    "touch_targets": { "...": "..." },
    "focus_visible": { "...": "..." }
  },
  "summary": "<one-paragraph analysis, 3-5 sentences>",
  "top_strengths": ["...", "...", "..."],
  "top_issues": ["...", "...", "..."]
}
```

Every leaf `score` is 1..5. Missing keys are disallowed.
