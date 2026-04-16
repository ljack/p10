# WebSocket API Reference

Real-time communication protocol for the P10 daemon mesh.

**URL:** `ws://localhost:7777`  
**Protocol:** JSON over WebSocket

## Connection

### Establishing Connection
```javascript
const ws = new WebSocket('ws://localhost:7777');

ws.onopen = () => {
  // Register as a daemon
  ws.send(JSON.stringify({
    type: 'register',
    payload: {
      id: 'my-daemon-1',
      type: 'custom',
      capabilities: ['task', 'query']
    }
  }));
};
```

### Connection Lifecycle
```
Connect → Register → Heartbeat (every 5s) → Messages → Disconnect
```

## Message Format

All messages follow this structure:

```typescript
interface MeshMessage {
  id: string;           // Unique message ID (UUID)
  from: string;         // Sender daemon ID
  to: string;           // Target: daemon ID, "*", "master", "broadcast"
  type: string;         // Message type (see below)
  payload: object;      // Type-specific data
  timestamp: string;    // ISO 8601 timestamp
}
```

## Core Message Types

### Registration
```json
{
  "type": "register",
  "payload": {
    "id": "pi-daemon-1",
    "type": "pi",
    "capabilities": ["task", "query", "code"],
    "metadata": {
      "model": "claude-3-sonnet",
      "role": "web_agent"
    }
  }
}
```

### Heartbeat
```json
{
  "type": "heartbeat",
  "from": "pi-daemon-1",
  "payload": {
    "status": "idle",
    "load": 0.2,
    "tasksCompleted": 15
  }
}
```

### Task
```json
{
  "type": "task",
  "to": "*",
  "payload": {
    "instruction": "Build a login form",
    "context": "Use React and Tailwind",
    "priority": "normal",
    "role": "web_agent"
  }
}
```

### Task Result
```json
{
  "type": "task_result",
  "payload": {
    "taskId": "task-abc123",
    "status": "completed",
    "result": "Login form created with email/password fields",
    "artifacts": ["src/components/LoginForm.tsx"],
    "duration": 45000
  }
}
```

### Query
```json
{
  "type": "query",
  "to": "browser",
  "payload": {
    "question": "What errors are in the console?",
    "timeout": 15000
  }
}
```

### Query Response
```json
{
  "type": "query_response",
  "payload": {
    "queryId": "query-xyz",
    "response": "No errors detected",
    "responder": "browser-daemon"
  }
}
```

## Event Types

### Pipeline Events
```json
// Pipeline started
{
  "type": "pipeline_started",
  "payload": {
    "pipelineId": "pipe-123",
    "instruction": "Build auth system",
    "taskCount": 6
  }
}

// Pipeline progress
{
  "type": "pipeline_progress",
  "payload": {
    "pipelineId": "pipe-123",
    "taskId": "task-2",
    "status": "active",
    "progress": { "completed": 1, "total": 6 }
  }
}

// Pipeline completed
{
  "type": "pipeline_completed",
  "payload": {
    "pipelineId": "pipe-123",
    "status": "completed",
    "duration": 180000,
    "results": [...]
  }
}
```

### Board Events
```json
// Task added
{
  "type": "board_task_added",
  "payload": {
    "taskId": "task-new",
    "title": "Fix login bug",
    "column": "planned"
  }
}

// Task moved
{
  "type": "board_task_moved",
  "payload": {
    "taskId": "task-abc",
    "from": "planned",
    "to": "in-progress"
  }
}
```

### State Events
```json
// State snapshot (from browser daemon)
{
  "type": "state_snapshot",
  "payload": {
    "container": "running",
    "preview": "http://localhost:3001",
    "errors": [],
    "apiRoutes": ["/api/todos", "/api/auth"]
  }
}
```

## Routing

### Target Addressing
| Target | Behavior |
|--------|----------|
| `"*"` | Smart route: tasks→pi, queries→browser |
| `"master"` | Handle by master daemon |
| `"broadcast"` | Send to all daemons |
| `"pi"` | Any available Pi daemon |
| `"browser"` | Browser daemon |
| `"daemon-id"` | Specific daemon by ID |

### Example Routing
```javascript
// Smart routing - master decides destination
ws.send(JSON.stringify({
  type: 'task',
  to: '*',
  payload: { instruction: 'Build component' }
}));

// Direct to browser
ws.send(JSON.stringify({
  type: 'query',
  to: 'browser',
  payload: { question: 'Current errors?' }
}));

// Broadcast to all
ws.send(JSON.stringify({
  type: 'mesh_event',
  to: 'broadcast',
  payload: { type: 'dev.milestone', data: { version: '1.0' } }
}));
```

## Subscriptions

### Event Subscription
```json
{
  "type": "subscribe",
  "payload": {
    "patterns": ["pipeline.*", "board.*", "task.completed"]
  }
}
```

### Unsubscribe
```json
{
  "type": "unsubscribe",
  "payload": {
    "patterns": ["pipeline.*"]
  }
}
```

## Error Handling

### Error Message
```json
{
  "type": "error",
  "payload": {
    "code": "DAEMON_NOT_FOUND",
    "message": "Target daemon not connected",
    "originalMessageId": "msg-123"
  }
}
```

### Error Codes
| Code | Description |
|------|-------------|
| `INVALID_MESSAGE` | Malformed message |
| `DAEMON_NOT_FOUND` | Target daemon offline |
| `UNAUTHORIZED` | Permission denied |
| `RATE_LIMITED` | Too many messages |
| `TIMEOUT` | Response timeout |

## Client Example

```javascript
class P10WebSocketClient {
  constructor(url = 'ws://localhost:7777') {
    this.ws = new WebSocket(url);
    this.handlers = new Map();
    this.pendingQueries = new Map();
    
    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      this.handleMessage(msg);
    };
  }
  
  register(id, type, capabilities) {
    this.send({
      type: 'register',
      payload: { id, type, capabilities }
    });
  }
  
  async query(question, target = '*', timeout = 15000) {
    const id = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      this.pendingQueries.set(id, { resolve, reject });
      setTimeout(() => reject(new Error('Timeout')), timeout);
      
      this.send({
        id,
        type: 'query',
        to: target,
        payload: { question }
      });
    });
  }
  
  task(instruction, options = {}) {
    this.send({
      type: 'task',
      to: options.target || '*',
      payload: {
        instruction,
        context: options.context,
        priority: options.priority || 'normal'
      }
    });
  }
  
  on(type, handler) {
    this.handlers.set(type, handler);
  }
  
  handleMessage(msg) {
    if (msg.type === 'query_response') {
      const pending = this.pendingQueries.get(msg.payload.queryId);
      if (pending) {
        pending.resolve(msg.payload.response);
        this.pendingQueries.delete(msg.payload.queryId);
      }
    }
    
    const handler = this.handlers.get(msg.type);
    if (handler) handler(msg.payload);
  }
  
  send(msg) {
    msg.id = msg.id || crypto.randomUUID();
    msg.timestamp = new Date().toISOString();
    this.ws.send(JSON.stringify(msg));
  }
}

// Usage
const client = new P10WebSocketClient();
client.register('my-app', 'custom', ['query']);

client.on('task_result', (result) => {
  console.log('Task completed:', result);
});

const answer = await client.query('System status?');
console.log(answer);
```

## Next Steps

- **[Message Types](message-types.md)** - Complete message specifications
- **[REST API](rest-api.md)** - HTTP endpoints
- **[Mesh Tools](mesh-tools.md)** - CLI integration