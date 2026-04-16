# Fix Task

Your previous build of this Todo UI (in the CURRENT DIRECTORY) has one accessibility violation reported by axe-core. See \`axe-report.json\` in this directory for the exact violation, including the impact, rule id, help text, and offending selectors.

## Task
1. Read \`axe-report.json\`.
2. Fix the single accessibility violation described there. Edit only the files you need (likely \`styles.css\` and/or \`index.html\`).
3. Do not break any existing \`data-testid\`, \`aria-label\`, text content, or behavioural contract — the UI is exercised by a functional E2E test suite that must keep passing.
4. Do not reorganize or re-style the rest of the app. Minimal, surgical change.

## Definition of Done
- The specific axe violation described in \`axe-report.json\` no longer occurs.
- All other behaviour is unchanged.
- No TODOs, no new stray files, no background processes.

Keep the change minimal. Explain nothing. Just make the edit.
