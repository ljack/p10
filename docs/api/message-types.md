# Message Types Reference

Complete specification of all WebSocket message types in the P10 mesh protocol.

## Message Categories

| Category | Types | Purpose |
|----------|-------|---------|
| **System** | register, heartbeat, error | Connection management |
| **Tasks** | task, task_result, task_progress | Work execution |
| **Queries** | query, query_response | Information retrieval |
| **Pipeline** | pipeline_*, task_* | Multi-agent orchestration |
| **Board** | board_* | Kanban management |
| **Events** | mesh_event, subscribe | Pub/sub communication |
| **State** | state_snapshot, approval_* | System state |

## System Messages

### register
Daemon registration with the mesh.

```typescript
{
  type: "register",
  payload: {
    id: string,           // Unique daemon ID
    type: "pi" | "browser" | "telegram" | "custom",
    capabilities: string[], // ["task", "query", "code"]
    metadata?: {
      model?: string,     // AI model (for pi daemons)
      role?: string,      // Agent role
      version?: string
    }
  }
}
```

### heartbeat
Keep-alive signal (every 5 seconds).

```typescript
{
  type: "heartbeat",
  from: string,           // Daemon ID
  payload: {
    status: "idle" | "busy" | "error",
    load?: number,        // 0-1 load indicator
    currentTask?: string, // Active task ID
    tasksCompleted?: number
  }
}
```

### error
Error notification.

```typescript
{
  type: "error",
  payload: {
    code: string,         // Error code
    message: string,      // Human-readable message
    details?: object,     // Additional context
    originalMessageId?: string
  }
}
```

## Task Messages

### task
Submit a coding task.

```typescript
{
  type: "task",
  to: string,             // Target daemon or "*"
  payload: {
    instruction: string,  // What to do
    context?: string,     // Additional context
    priority?: "low" | "normal" | "high" | "urgent",
    role?: string,        // Preferred agent role
    pipelineId?: string,  // Parent pipeline
    taskId?: string       // For tracking
  }
}
```

### task_result
Task completion notification.

```typescript
{
  type: "task_result",
  payload: {
    taskId: string,
    messageId: string,    // Original message ID
    status: "completed" | "failed" | "cancelled",
    result?: string,      // Success message/output
    error?: string,       // Error message if failed
    artifacts?: string[], // Created/modified files
    duration: number,     // Execution time (ms)
    model?: string,       // Model used
    tokensUsed?: number
  }
}
```

### task_progress
Real-time task progress update.

```typescript
{
  type: "task_progress",
  payload: {
    taskId: string,
    status: "starting" | "running" | "finishing",
    progress?: number,    // 0-100 percentage
    currentStep?: string, // Current action
    output?: string       // Streaming output
  }
}
```

## Query Messages

### query
Ask a daemon a question.

```typescript
{
  type: "query",
  to: string,             // Target daemon
  payload: {
    question: string,
    timeout?: number,     // Response timeout (ms)
    context?: object      // Additional context
  }
}
```

### query_response
Response to a query.

```typescript
{
  type: "query_response",
  payload: {
    queryId: string,      // Original message ID
    response: string,     // Answer
    responder: string,    // Responding daemon ID
    confidence?: number   // 0-1 confidence score
  }
}
```

## Pipeline Messages

### pipeline_created
New pipeline created.

```typescript
{
  type: "pipeline_created",
  payload: {
    pipelineId: string,
    instruction: string,
    tasks: Array<{
      id: string,
      agent: string,
      instruction: string,
      dependencies: string[]
    }>,
    estimatedDuration: number,
    boardTaskId: string   // Associated board task
  }
}
```

### pipeline_progress
Pipeline execution update.

```typescript
{
  type: "pipeline_progress",
  payload: {
    pipelineId: string,
    status: "planning" | "executing" | "recovering" | "completed" | "failed",
    currentTask?: {
      id: string,
      agent: string,
      instruction: string
    },
    progress: {
      completed: number,
      total: number,
      percentage: number
    }
  }
}
```

### pipeline_task_completed
Individual pipeline task completed.

```typescript
{
  type: "pipeline_task_completed",
  payload: {
    pipelineId: string,
    taskId: string,
    agent: string,
    status: "completed" | "failed",
    result?: string,
    error?: string,
    duration: number
  }
}
```

### pipeline_completed
Pipeline finished.

```typescript
{
  type: "pipeline_completed",
  payload: {
    pipelineId: string,
    status: "completed" | "failed" | "cancelled",
    results: Array<{
      taskId: string,
      agent: string,
      result: string
    }>,
    duration: number,
    summary?: string
  }
}
```

## Board Messages

### board_task_added
New task added to board.

```typescript
{
  type: "board_task_added",
  payload: {
    task: {
      id: string,
      title: string,
      description?: string,
      priority: string,
      tags: string[],
      column: "planned",
      createdAt: string,
      humanCreated: boolean
    }
  }
}
```

### board_task_updated
Task modified.

```typescript
{
  type: "board_task_updated",
  payload: {
    taskId: string,
    changes: {
      column?: string,
      priority?: string,
      assignedTo?: string,
      result?: string
    },
    previousValues: object
  }
}
```

### board_task_moved
Task moved between columns.

```typescript
{
  type: "board_task_moved",
  payload: {
    taskId: string,
    from: string,         // Previous column
    to: string,           // New column
    reason?: string
  }
}
```

### board_sync
Board synchronized with PLAN.md.

```typescript
{
  type: "board_sync",
  payload: {
    added: number,
    updated: number,
    removed: number,
    planFile: string
  }
}
```

## Event Messages

### mesh_event
Custom event broadcast.

```typescript
{
  type: "mesh_event",
  payload: {
    eventType: string,    // e.g., "dev.milestone"
    data: object,         // Event-specific data
    scope: "broadcast" | "pi" | "browser" | "telegram"
  }
}
```

### subscribe
Subscribe to event patterns.

```typescript
{
  type: "subscribe",
  payload: {
    patterns: string[]    // Glob patterns: ["task.*", "board.*"]
  }
}
```

### unsubscribe
Unsubscribe from patterns.

```typescript
{
  type: "unsubscribe",
  payload: {
    patterns: string[]
  }
}
```

## State Messages

### state_snapshot
Browser daemon state report.

```typescript
{
  type: "state_snapshot",
  payload: {
    container: {
      status: "booting" | "running" | "error" | "stopped",
      uptime?: number
    },
    preview: {
      url?: string,
      ready: boolean
    },
    build: {
      status: "idle" | "building" | "success" | "error",
      errors: string[],
      warnings: string[]
    },
    api: {
      routes: string[],
      errors: Array<{path: string, error: string}>
    }
  }
}
```

### approval_request
Request human approval for risky operation.

```typescript
{
  type: "approval_request",
  payload: {
    requestId: string,
    operation: string,    // Command or action
    riskLevel: "medium" | "high" | "critical",
    context: string,      // Why this is needed
    timeout: number       // Auto-reject after (ms)
  }
}
```

### approval_response
Human approval decision.

```typescript
{
  type: "approval_response",
  payload: {
    requestId: string,
    approved: boolean,
    reason?: string,
    approver: string      // Who approved/rejected
  }
}
```

## Run Messages

### run_started
Autonomous run started.

```typescript
{
  type: "run_started",
  payload: {
    runId: string,
    instruction: string,
    planFile?: string,
    tasks: number,        // Total tasks found
    estimatedDuration: number
  }
}
```

### run_progress
Autonomous run progress.

```typescript
{
  type: "run_progress",
  payload: {
    runId: string,
    status: "running" | "paused",
    pipelinesCompleted: number,
    pipelinesTotal: number,
    currentPipeline?: {
      id: string,
      instruction: string
    }
  }
}
```

### run_completed
Autonomous run finished.

```typescript
{
  type: "run_completed",
  payload: {
    runId: string,
    status: "completed" | "failed" | "cancelled",
    duration: number,
    pipelinesCompleted: number,
    pipelinesFailed: number,
    report?: string       // Morning report content
  }
}
```

## Message ID Format

All messages use UUID v4 for IDs:
```
msg-550e8400-e29b-41d4-a716-446655440000
```

## Timestamp Format

All timestamps use ISO 8601:
```
2026-04-07T12:00:00.000Z
```

## Next Steps

- **[WebSocket API](websocket.md)** - Connection handling
- **[REST API](rest-api.md)** - HTTP endpoints
- **[Mesh Tools](mesh-tools.md)** - CLI integration