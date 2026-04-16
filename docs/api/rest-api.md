# REST API Reference

Complete HTTP API reference for P10 mesh operations.

**Base URL:** `http://localhost:7777`  
**Content-Type:** `application/json`  
**Authentication:** None (localhost only)

## Quick Reference

| Category | Endpoints |
|----------|-----------|
| **System** | [Health](#health), [Status](#status), [Restart](#restart) |
| **Tasks** | [Submit](#submit-task), [Query](#query-daemon), [Messages](#message-history) |
| **Board** | [Get Board](#get-board), [Add Task](#add-task), [Update Task](#update-task), [PLAN Sync](#plan-sync) |
| **Memory** | [Get Memory](#get-memory), [Search](#search-memory), [Rebirth](#rebirth-task) |
| **Pipelines** | [Launch](#launch-pipeline), [Status](#pipeline-status), [Control](#pipeline-control) |
| **Runs** | [Start Run](#start-autonomous-run), [Run Status](#run-status), [Run Control](#run-control) |
| **Events** | [Event History](#event-history), [Emit Event](#emit-event) |

## System Endpoints

### Health
Simple health check endpoint.

```bash
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-04-07T12:00:00Z"
}
```

### Status
Comprehensive system status including all daemons.

```bash
GET /status
```

**Response:**
```json
{
  "daemons": [
    {
      "id": "master",
      "type": "master", 
      "status": "alive",
      "lastHeartbeat": "2026-04-07T12:00:00Z",
      "metadata": {
        "version": "1.0.0",
        "uptime": 3600
      }
    },
    {
      "id": "pi-daemon-1",
      "type": "pi",
      "status": "alive", 
      "lastHeartbeat": "2026-04-07T11:59:58Z",
      "metadata": {
        "model": "claude-3-sonnet",
        "role": "web_agent"
      }
    }
  ],
  "board": {
    "planned": 5,
    "inProgress": 2,
    "done": 15,
    "failed": 1,
    "blocked": 0
  },
  "pipelines": {
    "active": 1,
    "completed": 8,
    "failed": 0
  },
  "tldr": "System healthy. 2 tasks in progress, 1 pipeline active."
}
```

### Restart
Gracefully restart the master daemon.

```bash
POST /restart
```

**Response:**
```json
{
  "message": "Restart initiated",
  "timestamp": "2026-04-07T12:00:00Z"
}
```

## Task & Query Endpoints

### Submit Task
Send a coding task to available Pi daemons.

```bash
POST /task
```

**Request:**
```json
{
  "instruction": "Build a todo app with React",
  "context": "Use modern React hooks and TypeScript",
  "priority": "normal",
  "channel": "rest-api"
}
```

**Parameters:**
- `instruction` (required) - What to build or do
- `context` (optional) - Additional context or constraints
- `priority` (optional) - `low`, `normal`, `high`, `urgent` (default: `normal`)
- `channel` (optional) - Source channel identifier (default: `rest-api`)

**Response:**
```json
{
  "messageId": "msg-abc123",
  "timestamp": "2026-04-07T12:00:00Z",
  "status": "queued"
}
```

### Query Daemon
Query any connected daemon with a question.

```bash
POST /query
```

**Request:**
```json
{
  "question": "What files have been created?",
  "target": "*",
  "timeout": 15
}
```

**Parameters:**
- `question` (required) - Question to ask
- `target` (optional) - Target daemon ID or `*` for broadcast (default: `*`)
- `timeout` (optional) - Timeout in seconds (default: 15)

**Response:**
```json
{
  "response": "I've created 5 files: TodoList.tsx, TodoItem.tsx, api/todos.ts, App.tsx, and index.tsx",
  "responder": "pi-daemon-1",
  "timestamp": "2026-04-07T12:00:00Z"
}
```

### Message History
Get message history for tracking task origins and results.

```bash
GET /messages
```

**Query Parameters:**
- `channel` (optional) - Filter by channel (`telegram`, `browser-chat`, `rest-api`)
- `limit` (optional) - Number of messages to return (default: 20)
- `offset` (optional) - Offset for pagination

**Response:**
```json
{
  "messages": [
    {
      "id": "msg-abc123",
      "channel": "rest-api", 
      "type": "task",
      "content": "Build a todo app",
      "status": "completed",
      "result": "Todo app built successfully with 5 components",
      "timestamp": "2026-04-07T11:45:00Z",
      "completedAt": "2026-04-07T11:52:30Z"
    }
  ],
  "total": 45
}
```

## Board Endpoints

### Get Board
Retrieve the current kanban board state.

```bash
GET /board
```

**Query Parameters:**
- `column` (optional) - Filter to specific column: `planned`, `in-progress`, `done`, `failed`, `blocked`

**Response:**
```json
{
  "columns": {
    "planned": [
      {
        "id": "task-abc123",
        "title": "Add user authentication",
        "description": "Implement login and registration",
        "priority": "high",
        "tags": ["auth", "security"],
        "createdAt": "2026-04-07T10:00:00Z",
        "humanCreated": true
      }
    ],
    "inProgress": [
      {
        "id": "task-def456",
        "title": "Build todo API endpoints",
        "assignedTo": "pi-daemon-1",
        "startedAt": "2026-04-07T11:30:00Z"
      }
    ],
    "done": [],
    "failed": [],
    "blocked": []
  },
  "stats": {
    "planned": 5,
    "inProgress": 1, 
    "done": 15,
    "failed": 1,
    "blocked": 0
  }
}
```

### Add Task
Add a new task to the board.

```bash
POST /board/task
```

**Request:**
```json
{
  "title": "Fix login validation bug",
  "description": "Users can login with empty password",
  "priority": "urgent",
  "tags": ["bug", "auth"],
  "humanCreated": true
}
```

**Parameters:**
- `title` (required) - Task title
- `description` (optional) - Detailed description
- `priority` (optional) - `low`, `normal`, `high`, `urgent` (default: `normal`)
- `tags` (optional) - Array of tags for categorization
- `humanCreated` (optional) - Whether created by human (triggers AI analysis, default: `true`)
- `scope` (optional) - `project` or `platform` (default: `project`)

**Response:**
```json
{
  "id": "task-xyz789",
  "title": "Fix login validation bug",
  "status": "planned",
  "createdAt": "2026-04-07T12:00:00Z"
}
```

### Update Task
Update an existing task (move between columns, update details).

```bash
PATCH /board/task/:id
```

**Request:**
```json
{
  "column": "in-progress",
  "assignedTo": "pi-daemon-2",
  "priority": "high"
}
```

**Response:**
```json
{
  "id": "task-abc123", 
  "status": "updated",
  "timestamp": "2026-04-07T12:00:00Z"
}
```

### Delete Task
Remove a task from the board.

```bash
DELETE /board/task/:id
```

**Response:**
```json
{
  "id": "task-abc123",
  "status": "deleted",
  "timestamp": "2026-04-07T12:00:00Z"
}
```

### PLAN Sync
Synchronize board with PLAN.md file.

```bash
# Get sync status
GET /board/sync

# Trigger sync
POST /board/sync
```

**GET Response:**
```json
{
  "lastSync": "2026-04-07T11:30:00Z",
  "planFile": "PLAN.md",
  "boardTasks": 12,
  "planTasks": 15,
  "syncNeeded": true
}
```

**POST Response:**
```json
{
  "status": "synced",
  "added": 3,
  "updated": 1,
  "timestamp": "2026-04-07T12:00:00Z"
}
```

## Memory Endpoints

### Get Memory
Retrieve memory tree (archives, memories, reflections).

```bash
# All memory
GET /board/memory

# Specific node
GET /board/memory/:id

# Reflections only
GET /board/memory/reflections
```

**Response:**
```json
{
  "reflections": [
    {
      "id": "reflection-1",
      "title": "Authentication Patterns",
      "summary": "The project uses JWT tokens with refresh token rotation...",
      "insights": ["Token rotation improves security", "Middleware pattern works well"],
      "createdAt": "2026-04-07T10:00:00Z",
      "sourceMemories": 5
    }
  ],
  "memories": [
    {
      "id": "memory-1", 
      "title": "Todo App Development",
      "summary": "Built a complete todo application with React frontend and Express backend",
      "sourceArchives": 8,
      "tags": ["react", "express", "crud"]
    }
  ]
}
```

### Search Memory
Search across all memory tiers.

```bash
GET /board/memory/search?q=authentication
```

**Response:**
```json
{
  "results": [
    {
      "type": "reflection",
      "id": "reflection-1",
      "title": "Authentication Patterns", 
      "relevance": 0.95,
      "snippet": "JWT tokens with refresh rotation..."
    },
    {
      "type": "memory",
      "id": "memory-5",
      "title": "Auth Implementation",
      "relevance": 0.87,
      "snippet": "Built login and registration endpoints..."
    }
  ],
  "total": 12
}
```

### Rebirth Task
Recreate a task from archived memory.

```bash
POST /board/memory/rebirth/:id
```

**Response:**
```json
{
  "taskId": "task-new123",
  "title": "Rebuilt: Add user authentication",
  "status": "planned",
  "sourceMemory": "memory-abc123"
}
```

## Pipeline Endpoints

### Launch Pipeline
Start a multi-agent pipeline for complex tasks.

```bash
POST /pipeline
```

**Request:**
```json
{
  "instruction": "Build authentication with login and registration",
  "context": "Use JWT tokens and secure password hashing",
  "channel": "rest-api"
}
```

**Response:**
```json
{
  "pipelineId": "pipeline-abc123",
  "status": "planning",
  "estimatedTasks": 6,
  "estimatedDuration": "15-30 minutes",
  "timestamp": "2026-04-07T12:00:00Z"
}
```

### Pipeline Status
Get status of specific pipeline or all pipelines.

```bash
# Specific pipeline
GET /pipeline/:id

# All active/recent pipelines  
GET /pipelines
```

**Response:**
```json
{
  "id": "pipeline-abc123",
  "instruction": "Build authentication system",
  "status": "executing",
  "progress": {
    "completed": 3,
    "total": 6,
    "percentage": 50
  },
  "tasks": [
    {
      "id": "task-1",
      "agent": "planning_agent", 
      "instruction": "Analyze auth requirements",
      "status": "completed",
      "result": "Requirements analysis complete"
    },
    {
      "id": "task-2", 
      "agent": "api_agent",
      "instruction": "Create auth endpoints",
      "status": "active",
      "startedAt": "2026-04-07T11:45:00Z"
    }
  ],
  "createdAt": "2026-04-07T11:30:00Z",
  "estimatedCompletion": "2026-04-07T12:15:00Z"
}
```

### Pipeline Control
Control pipeline execution.

```bash
# Cancel pipeline
POST /pipeline/:id/cancel

# Re-run failed pipeline  
POST /pipeline/:id/rerun
```

**Response:**
```json
{
  "pipelineId": "pipeline-abc123",
  "status": "cancelled",
  "timestamp": "2026-04-07T12:00:00Z"
}
```

## Autonomous Run Endpoints

### Start Autonomous Run
Start an overnight autonomous development run.

```bash
POST /runs/start
```

**Request:**
```json
{
  "instruction": "Build everything in PLAN.md",
  "planFile": "PLAN.md"
}
```

**Response:**
```json
{
  "runId": "run-abc123",
  "status": "starting", 
  "tasksFound": 12,
  "estimatedDuration": "4-8 hours",
  "timestamp": "2026-04-07T22:00:00Z"
}
```

### Run Status
Get status of autonomous runs.

```bash
# Specific run
GET /runs/:id

# All runs
GET /runs
```

**Response:**
```json
{
  "id": "run-abc123",
  "instruction": "Build everything in PLAN.md",
  "status": "running",
  "progress": {
    "pipelinesCompleted": 5,
    "pipelinesTotal": 12,
    "percentage": 42
  },
  "currentPipeline": {
    "id": "pipeline-def456",
    "instruction": "Build payment system",
    "status": "executing"
  },
  "startedAt": "2026-04-07T22:00:00Z",
  "estimatedCompletion": "2026-04-08T04:30:00Z"
}
```

### Run Control
Control autonomous run execution.

```bash
# Pause run
POST /runs/:id/pause

# Resume run
POST /runs/:id/resume

# Cancel run
POST /runs/:id/cancel
```

## Event Endpoints

### Event History
Get event bus history.

```bash
GET /events
```

**Query Parameters:**
- `pattern` (optional) - Filter by event type pattern (e.g., `task.*`, `pipeline.*`)
- `limit` (optional) - Number of events (default: 20)

**Response:**
```json
{
  "events": [
    {
      "type": "task.completed",
      "data": {
        "taskId": "task-abc123",
        "result": "Authentication system built successfully"
      },
      "scope": "broadcast",
      "timestamp": "2026-04-07T12:00:00Z"
    }
  ],
  "total": 150
}
```

### Emit Event
Emit an event to the mesh.

```bash
POST /events/emit
```

**Request:**
```json
{
  "type": "dev.solution.found",
  "data": {
    "problem": "Performance optimization",
    "solution": "Database indexing improved query speed by 300%"
  },
  "scope": "broadcast"
}
```

**Response:**
```json
{
  "eventId": "event-abc123",
  "status": "emitted",
  "timestamp": "2026-04-07T12:00:00Z"
}
```

## Error Responses

### Standard Error Format
```json
{
  "error": "Error description",
  "code": "ERROR_CODE", 
  "details": {
    "field": "instruction",
    "value": "",
    "expected": "non-empty string"
  },
  "timestamp": "2026-04-07T12:00:00Z"
}
```

### HTTP Status Codes

| Code | Description | Common Causes |
|------|-------------|---------------|
| 200 | Success | Request completed successfully |
| 400 | Bad Request | Invalid parameters or malformed JSON |
| 404 | Not Found | Resource doesn't exist (task, pipeline, etc.) |
| 429 | Rate Limited | Too many requests |
| 500 | Internal Error | System error, check logs |
| 503 | Service Unavailable | Daemon not available or overloaded |

## Examples

### Complete Task Workflow
```bash
# 1. Submit a task
TASK_RESPONSE=$(curl -X POST http://localhost:7777/task \
  -H "Content-Type: application/json" \
  -d '{"instruction": "Build a todo app"}')

# 2. Monitor via board
curl http://localhost:7777/board

# 3. Check completion via messages  
curl http://localhost:7777/messages?channel=rest-api
```

### Pipeline Workflow
```bash
# 1. Launch pipeline
PIPELINE=$(curl -X POST http://localhost:7777/pipeline \
  -H "Content-Type: application/json" \
  -d '{"instruction": "Build auth system"}')

PIPELINE_ID=$(echo $PIPELINE | jq -r '.pipelineId')

# 2. Monitor progress
watch "curl -s http://localhost:7777/pipeline/$PIPELINE_ID | jq '.progress'"

# 3. Get final results
curl http://localhost:7777/pipeline/$PIPELINE_ID
```

## Rate Limiting

Current implementation has no enforced rate limits for localhost development. In production deployments, the following limits are planned:

| Endpoint | Limit | Window |
|----------|-------|--------|
| Task submission | 100 requests | 1 hour |
| Board operations | 1000 requests | 1 hour |  
| Status queries | 10000 requests | 1 hour |

## Next Steps

- **[WebSocket API](websocket.md)** - Real-time communication protocol
- **[Mesh Tools](mesh-tools.md)** - CLI integration tools  
- **[Message Types](message-types.md)** - WebSocket message specifications
- **[Architecture Overview](../architecture/overview.md)** - System design details