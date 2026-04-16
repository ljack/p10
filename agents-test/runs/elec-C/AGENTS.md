# AGENTS.md

## Think Before Coding
Before writing any code, outline your approach in a brief plan. Identify assumptions,
potential tradeoffs, and edge cases. This stops wrong assumptions and missed tradeoffs.

## Simplicity First
Use the simplest solution that satisfies the requirements. No premature abstractions,
no extra layers, no "just in case" code. If a flat function works, don't make it a class.
This stops over-engineering and bloated abstractions.

## Surgical Changes
Only write code that directly serves the requirements. Don't refactor unrelated things,
don't add features that weren't asked for, don't "improve" working code while building
something else. This stops touching code nobody asked to touch.

## Goal-Driven Execution
Define what "done" looks like before starting each piece. Write success criteria first.
Verify each component works before moving to the next. If something fails, fix it before
proceeding. This ensures tests first and verified success criteria.
