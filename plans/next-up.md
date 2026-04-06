# What's Next — P10 Backlog

## Platform Tasks (P10 system/infra)

### 1. Registry cleanup — deduplicate stale daemon registrations
**Priority:** high  
**Scope:** platform  
**Description:** Pi CLI reconnects create duplicate daemon registrations in the master registry. PID 31891 shows 5 entries. Need to: deduplicate on re-register by matching PID or session ID, prune dead/stale entries on heartbeat check, and clean up on WebSocket close.  
**Files:** `p10-master/src/registry.ts`, `p10-master/src/index.ts`

### 2. Multi-agent pipeline improvements
**Priority:** normal  
**Scope:** platform  
**Description:** Plan-driven decomposition from PLAN.md (TODO in decomposer.ts), parallel task execution where dependencies allow, better error messages and retry logic.  
**Files:** `p10-master/src/decomposer.ts`, `p10-master/src/pipelineExecutor.ts`

### 3. End-to-end test coverage
**Priority:** normal  
**Scope:** platform  
**Description:** Playwright E2E tests for the full pipeline flow: user sends instruction → pipeline decomposes → tasks execute → board updates → results route back. Also test activity events, board persistence, and Telegram notifications.  
**Files:** `svelteapp/tests/`

### 4. Production deployment pipeline
**Priority:** low  
**Scope:** platform  
**Description:** Packaging, deploy scripts, environment configs, health monitoring. Make it easy to run P10 on a server with proper process management.

### 5. Documentation site
**Priority:** low  
**Scope:** platform  
**Description:** Architecture docs, API reference, extension guide, setup instructions. Probably a simple static site or markdown-based docs.
