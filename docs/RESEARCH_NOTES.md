# Research Notes & Inspiration

## Attention Residuals / TLDR Layers

**Source:** https://www.youtube.com/watch?v=2IfAVV7ewO0

**Core idea:** "I heard you like attention layers, so we applied attention layers wrapping your attention layers!"

In transformer architectures, attention residuals allow information to flow through layers without being lost — each layer adds to the signal rather than replacing it. The residual connection preserves what was already learned while adding new refinements.

### How this applies to P10

The same principle applies to our multi-layer agent architecture and spec-driven development:

**1. TLDR as attention residual in the debug/feedback pipeline:**
- Each system layer (Container → Bridge → API Explorer → Chat → Agent) produces a TLDR summary for the next layer
- The summary preserves the essential signal while compressing the noise
- Like a residual connection, the TLDR carries forward what matters without losing it in the depth of the stack
- The CLI agent (me) doesn't need to see every console.log — it needs the TLDR that captures the state

**2. Spec-driven development as attention layers:**
- IDEA.md → PRD.md → FSD.md → PLAN.md → Code
- Each spec document is a "refined attention layer" over the original idea
- The residual connection: each spec references and refines the previous one, never fully replacing it
- When reprompting the agent, the spec context acts as the residual — it carries the accumulated design decisions forward into each new prompt

**3. Multi-agent context management:**
- When the Orchestrator passes context to a specialized agent (API Agent, Web Agent), it creates a TLDR of the full project state
- This is the attention residual — the agent gets a compressed but complete signal
- Without it, each agent would need the full context (attention over everything = expensive and noisy)
- With it, each agent sees a focused view + residual of the broader context

**4. 24h Loop as temporal attention:**
- Daytime human work = new attention on the project
- Nighttime agent work = processing with residual of human decisions (the specs)
- Morning review = attention over the agent's output, guided by the residual of yesterday's context
- The specs are the residual stream that flows across the day/night boundary

### Design implications

- Every layer in P10 should produce a TLDR for the layer above/below it
- TLDRs should be structured, not just free text — key-value summaries, status enums, counts
- The debug bus snapshot is our first implementation of this pattern
- Future: each agent produces a TLDR of its work for the Orchestrator
- Future: the Orchestrator produces a TLDR of overall progress for the human's morning report
