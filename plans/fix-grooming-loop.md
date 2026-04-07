# Fix: Grooming Agent Retry Loop + Pi Daemon Concurrency

## Problems Found

### 1. Grooming agent infinite retry loop
The grooming agent runs every 5 minutes and tries to consolidate completed tasks
into memory summaries. When the summarization task fails (e.g., Pi Agent busy),
the failed archives stay as orphans → next groom cycle picks them up again →
sends another summarization task → fails again → loop forever.

Result: 53 errors out of 56 tasks, all the same failed consolidation.

### 2. Pi Daemon rejects concurrent requests
The pi SDK's `session.prompt()` throws "Agent is already processing" when called
while another prompt is in flight. The pi daemon has no request queue — concurrent
tasks from grooming agent + task analyst + user tasks all hit the same session
and only the first one succeeds.

### 3. Failed tasks pollute the archive
Tasks that failed with "Agent is already processing" get archived as completed
work, then the grooming agent tries to summarize them, producing garbage context.

## Fixes

### Fix 1: Grooming — max retry + skip permanently failed
- Track consolidation attempt count per archive group
- After 3 failed attempts, mark archives as "consolidated" with a placeholder
  (stop retrying, accept the loss)
- Don't consolidate archives whose summaries are just error messages

### Fix 2: Pi Daemon — simple task queue
- Add a task queue in the pi daemon
- When a task arrives and the session is busy, queue it
- Process queue FIFO after current task completes
- Cap queue size (reject if queue > 10 to prevent backlog explosion)

### Fix 3: Grooming — filter garbage archives
- Skip archives where the result is an error message ("Agent is already processing")
- Don't count failed consolidation tasks as work to archive

## Implementation Order
1. Pi Daemon task queue (prevents the root cause)
2. Grooming retry limit (prevents the loop)
3. Garbage filtering (prevents bad data)
