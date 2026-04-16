# Mesh Tools Reference

Pi CLI extensions for interacting with the P10 daemon mesh.

**Location:** `.pi/extensions/`  
**Usage:** Available in any pi CLI session

## Overview

P10 provides 19 custom mesh tools that integrate the pi coding agent with the daemon mesh. These tools enable direct mesh interaction from within pi sessions.

## Core Tools

### mesh_status
Get daemon health and system overview.

```bash
> mesh_status
```

**Output:**
```json
{
  "daemons": [
    { "id": "master", "type": "master", "status": "alive" },
    { "id": "pi-daemon-1", "type": "pi", "status": "alive" },
    { "id": "browser", "type": "browser", "status": "alive" }
  ],
  "tldr": "System healthy. 2 tasks in progress."
}
```

### mesh_task
Send a coding task to the mesh.

```bash
> mesh_task "Build a user registration form"
> mesh_task "Fix the login validation bug" --priority high
```

**Parameters:**
- `instruction` (required) - What to build or do
- `context` (optional) - Additional context
- `priority` (optional) - low, normal, high, urgent
- `target` (optional) - Specific daemon or "*"

### mesh_query
Query any daemon with a question.

```bash
> mesh_query "What files have been modified?"
> mesh_query "Current errors?" --target browser
```

**Parameters:**
- `question` (required) - Question to ask
- `target` (optional) - Target daemon (default: "*")

**Returns:** Response from the first daemon that answers.

## Board Tools

### mesh_board
Get the current kanban board state.

```bash
> mesh_board
> mesh_board --column in-progress
```

**Output:**
```json
{
  "columns": {
    "planned": [{ "id": "task-1", "title": "Add auth" }],
    "inProgress": [{ "id": "task-2", "title": "Build API" }],
    "done": [],
    "failed": [],
    "blocked": []
  },
  "stats": { "planned": 5, "inProgress": 1, "done": 12 }
}
```

### mesh_add_task
Add a new task to the board.

```bash
> mesh_add_task "Implement password reset"
> mesh_add_task "Fix critical bug" --priority urgent --tags "bug,auth"
```

**Parameters:**
- `title` (required) - Task title
- `description` (optional) - Detailed description
- `priority` (optional) - low, normal, high, urgent
- `tags` (optional) - Comma-separated tags
- `scope` (optional) - "project" or "platform"

## Pipeline Tools

### mesh_pipeline
Launch a multi-agent pipeline.

```bash
> mesh_pipeline "Build authentication with login and registration"
```

**Output:**
```json
{
  "pipelineId": "pipe-abc123",
  "status": "planning",
  "estimatedTasks": 6
}
```

### mesh_pipeline_status
Check pipeline progress.

```bash
> mesh_pipeline_status
> mesh_pipeline_status pipe-abc123
```

### mesh_pipeline_cancel
Cancel a running pipeline.

```bash
> mesh_pipeline_cancel pipe-abc123
```

### mesh_pipeline_rerun
Retry a failed pipeline.

```bash
> mesh_pipeline_rerun pipe-abc123
```

## Autonomous Run Tools

### mesh_run
Start an autonomous development run.

```bash
> mesh_run "Build everything in PLAN.md"
> mesh_run --planFile "./PLAN.md"
```

**Parameters:**
- `instruction` (required) - What to build
- `planFile` (optional) - Path to PLAN.md file
- `planContent` (optional) - Raw plan content

### mesh_run_status
Check autonomous run progress.

```bash
> mesh_run_status
> mesh_run_status run-abc123
```

### mesh_run_pause
Pause a running autonomous run.

```bash
> mesh_run_pause run-abc123
```

### mesh_run_resume
Resume a paused run.

```bash
> mesh_run_resume run-abc123
```

### mesh_run_cancel
Cancel an autonomous run.

```bash
> mesh_run_cancel run-abc123
```

## Event Tools

### mesh_events
Get recent events from the event bus.

```bash
> mesh_events
> mesh_events --pattern "task.*" --limit 10
```

**Parameters:**
- `pattern` (optional) - Event type pattern (glob)
- `limit` (optional) - Number of events (default: 20)

### emit_mesh_event
Emit an event to the mesh.

```bash
> emit_mesh_event --type "dev.milestone" --data '{"version":"1.0"}'
```

**Parameters:**
- `type` (required) - Event type
- `data` (required) - Event payload (JSON)
- `scope` (optional) - broadcast, pi, browser, telegram

## Debug Tools

### mesh_debug
Get browser app debug snapshot.

```bash
> mesh_debug
```

**Output:**
```json
{
  "container": {
    "status": "running",
    "errors": []
  },
  "chat": {
    "messageCount": 25
  },
  "api": {
    "routes": ["/api/todos", "/api/auth"]
  },
  "tldr": "Container running. No errors. 4 API routes."
}
```

## Integration Tools

### mesh_setup_telegram
Start Telegram bot setup flow.

```bash
> mesh_setup_telegram
> mesh_setup_telegram --token "123456:ABC-DEF..."
```

### mesh_new_project
Reset workspace to clean state.

```bash
> mesh_new_project
```

⚠️ **Warning:** This clears the WebContainer, removes project tasks, and clears pipeline history.

### mesh_messages
Get message history from all channels.

```bash
> mesh_messages
> mesh_messages --channel telegram
```

**Parameters:**
- `channel` (optional) - Filter by: telegram, browser-chat, rest-api

## Slash Commands

These tools are also available as slash commands in pi chat:

| Command | Tool |
|---------|------|
| `/mesh` | mesh_status |
| `/board` | mesh_board |
| `/p10` | mesh_status (alias) |

## Tool Configuration

Tools use these environment variables:

```bash
MASTER_URL=ws://localhost:7777  # Mesh connection
P10_TIMEOUT=30000               # Query timeout (ms)
P10_LOG_LEVEL=info              # Logging verbosity
```

## Error Handling

All tools return structured errors:

```json
{
  "error": true,
  "code": "MESH_UNAVAILABLE",
  "message": "Cannot connect to master daemon",
  "suggestion": "Run ./start-mesh.sh to start P10"
}
```

## Examples

### Complete Workflow
```bash
# Check system status
> mesh_status

# Add a task to the board
> mesh_add_task "Build user dashboard" --priority high

# Launch a pipeline
> mesh_pipeline "Build user dashboard with charts and settings"

# Monitor progress
> mesh_pipeline_status

# Check for errors
> mesh_debug

# Query the agent
> mesh_query "What components did you create?"
```

### Autonomous Development
```bash
# Start overnight run
> mesh_run "Build everything in PLAN.md" --planFile "./PLAN.md"

# Check progress in the morning
> mesh_run_status

# View completed tasks
> mesh_board --column done
```

## Next Steps

- **[REST API](rest-api.md)** - HTTP endpoints
- **[WebSocket API](websocket.md)** - Real-time protocol
- **[Message Types](message-types.md)** - Message specifications