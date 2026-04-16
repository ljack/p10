# API Reference

Complete API reference for integrating with and extending P10.

## Quick Navigation

- [REST API](rest-api.md) - HTTP endpoints for all system operations
- [WebSocket API](websocket.md) - Real-time mesh communication protocol  
- [Mesh Tools](mesh-tools.md) - Pi CLI extensions for mesh interaction
- [Message Types](message-types.md) - All WebSocket message specifications
- [Integrations](integrations.md) - Telegram, GitHub, and external APIs
- [SDKs & Libraries](sdks.md) - Client libraries and development kits

## API Overview

P10 exposes multiple API layers for different use cases:

### REST API (HTTP)
**Base URL:** `http://localhost:7777`  
**Authentication:** API key (planned) or local access only  
**Format:** JSON request/response

Primary interface for:
- Task submission and management
- Board operations (CRUD)
- Pipeline orchestration  
- System status and health
- Memory and knowledge retrieval

### WebSocket API
**URL:** `ws://localhost:7777`  
**Protocol:** Custom P10 mesh protocol  
**Authentication:** Daemon registration

Real-time interface for:
- Agent-to-agent communication
- Live task progress updates
- Event publishing and subscription
- State synchronization
- Heartbeat monitoring

### Mesh Tools (CLI Extensions)
**Location:** `.pi/extensions/`  
**Platform:** pi CLI integration  
**Authentication:** Local daemon access

Command-line interface for:
- Direct mesh interaction from pi sessions
- Development workflow integration
- Automation and scripting
- Advanced debugging and introspection

## Common Patterns

### Task Submission
```bash
# Via REST API
curl -X POST http://localhost:7777/task \
  -H "Content-Type: application/json" \
  -d '{"instruction": "Build a todo app", "priority": "normal"}'

# Via WebSocket
{
  "type": "task",
  "to": "*",
  "payload": {
    "instruction": "Build a todo app",
    "context": "Use React and Express"
  }
}

# Via CLI
pi
> mesh_task "Build a todo app"
```

### Status Monitoring
```bash
# System health
GET /health

# Full system status  
GET /status

# Board overview
GET /board

# Pipeline status
GET /pipelines
```

### Real-time Updates
```javascript
// WebSocket subscription
const ws = new WebSocket('ws://localhost:7777');

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  switch (message.type) {
    case 'task_progress':
      updateTaskStatus(message.payload);
      break;
    case 'pipeline_complete':
      showPipelineResults(message.payload);
      break;
    case 'board_updated':
      refreshBoard();
      break;
  }
};
```

## Authentication & Security

### Local Development
- No authentication required for localhost access
- All operations permitted in development mode

### Production Deployment (Planned)
- API key authentication for REST endpoints
- JWT tokens for WebSocket connections
- Role-based access control (admin, developer, viewer)
- Rate limiting and request validation

### Security Considerations
- All destructive operations require approval gates
- File system access is sandboxed to project directory
- Network operations are monitored and logged
- Risk classification prevents dangerous commands

## Rate Limits

### Current Limits
- No enforced rate limits in development
- Natural throttling via LLM API calls
- WebSocket connection limits based on system resources

### Planned Limits
| Endpoint Category | Limit | Window |
|------------------|-------|---------|
| Task submission | 100 requests | 1 hour |
| Board operations | 1000 requests | 1 hour |
| Status queries | 10000 requests | 1 hour |
| WebSocket messages | 1000 messages | 1 minute |

## Error Handling

### HTTP Error Codes
```json
{
  "error": "Task validation failed",
  "code": "INVALID_TASK",
  "details": {
    "field": "instruction", 
    "message": "Instruction cannot be empty"
  },
  "timestamp": "2026-04-07T12:00:00Z"
}
```

### WebSocket Error Messages
```json
{
  "type": "error",
  "payload": {
    "code": "DAEMON_NOT_FOUND",
    "message": "Target daemon 'pi-daemon-2' is not connected",
    "originalMessage": { /* the failed message */ }
  }
}
```

### Common Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| `DAEMON_NOT_FOUND` | Target daemon not connected | Check daemon status |
| `INVALID_TASK` | Task validation failed | Fix task parameters |
| `SECURITY_BLOCKED` | Operation blocked by security | Request approval |
| `RATE_LIMITED` | Too many requests | Wait and retry |
| `SYSTEM_OVERLOAD` | System at capacity | Try again later |

## Pagination

Large result sets use cursor-based pagination:

```bash
# Get first page
GET /board/memory?limit=20

# Get next page  
GET /board/memory?cursor=eyJ0eXBlIjoib2JqZWN0IiwiaWQi&limit=20
```

Response format:
```json
{
  "data": [...],
  "pagination": {
    "hasNext": true,
    "nextCursor": "eyJ0eXBlIjoib2JqZWN0IiwiaWQi",
    "count": 20,
    "total": 157
  }
}
```

## API Clients

### JavaScript/Node.js
```javascript
const P10Client = require('@p10/client');

const client = new P10Client({
  baseURL: 'http://localhost:7777',
  websocket: true
});

// Submit task
const task = await client.tasks.create({
  instruction: 'Build auth system',
  priority: 'high'
});

// Monitor progress
client.on('task_progress', (progress) => {
  console.log(`Task ${progress.taskId}: ${progress.status}`);
});
```

### Python (Planned)
```python
from p10_client import P10Client

client = P10Client('http://localhost:7777')

# Submit task
task = client.tasks.create(
    instruction='Build auth system',
    priority='high'
)

# Monitor progress
for update in client.tasks.watch(task.id):
    print(f"Status: {update.status}")
```

### cURL Examples
See individual API documentation for comprehensive cURL examples covering all endpoints.

## Next Steps

- **[REST API](rest-api.md)** - Complete HTTP endpoint reference
- **[WebSocket API](websocket.md)** - Real-time communication protocol
- **[Mesh Tools](mesh-tools.md)** - CLI integration tools
- **[Message Types](message-types.md)** - WebSocket message specifications