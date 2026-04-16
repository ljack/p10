# Architecture

P10 is built as a distributed mesh of specialized AI agents that coordinate through WebSocket communication to build software collaboratively.

## Quick Navigation

- [Overview](overview.md) - High-level architecture and design principles
- [Mesh Network](mesh.md) - WebSocket mesh communication and routing
- [Components](components.md) - Detailed component breakdown
- [Task Lifecycle](task-lifecycle.md) - How tasks flow through the system
- [Memory System](memory.md) - Progressive knowledge compression
- [Pipeline System](pipelines.md) - Multi-agent orchestration
- [Security Model](security.md) - Safety checks and risk mitigation

## Core Architecture Principles

### 1. Distributed Agent Mesh
No single point of failure. Agents can join/leave dynamically while maintaining system coherence.

### 2. Specialized Responsibilities
Each agent type has a focused role rather than trying to be a general-purpose assistant.

### 3. Progressive Memory
Information flows from active tasks → archive → memories → reflections, preventing information overload.

### 4. Live Feedback Loops
Real-time monitoring of code execution provides immediate feedback to agents for rapid iteration.

### 5. Security by Design
Multi-layer security checks prevent destructive operations while maintaining development velocity.

## High-Level View

```
    You ───► Chat / Telegram / CLI
               │
    ┌──────────▼──────────────────────────────────────────┐
    │              P10 DAEMON MESH (WebSocket)             │
    │                                                      │
    │  ┌─────────┐   ┌──────────┐   ┌──────────────────┐  │
    │  │ Browser  │◄─►│  Master  │◄─►│   Pi Daemon      │  │
    │  │ Daemon   │   │  :7777   │   │   (AI Agent)     │  │
    │  │          │   │          │   │                   │  │
    │  │ Preview  │   │ Registry │   │ Claude + pi SDK   │  │
    │  │ Errors   │   │ Router   │   │ Code read/write  │  │
    │  │ API      │   │ Security │   │ Multi-role       │  │
    │  └─────────┘   │ Events   │   └──────────────────┘  │
    │                 │ Board    │   ┌──────────────────┐  │
    │                 │ Memory   │◄─►│  Telegram Bot    │  │
    │                 │ Runs     │   └──────────────────┘  │
    │                 │ Analyst  │   ┌──────────────────┐  │
    │                 │ Grooming │◄─►│  Pi CLI ×N       │  │
    │                 └──────────┘   └──────────────────┘  │
    └──────────────────────────────────────────────────────┘
               │
    ┌──────────▼──────────┐
    │  WebContainer        │
    │  (in-browser Node.js)│
    │  ├── Vite + React    │
    │  └── Express API     │
    └─────────────────────┘
```

## Key Capabilities

### Multi-Agent Coordination
- **Specialized roles**: planning, API development, web development, code review
- **Context handoffs**: Agents share context and build upon each other's work
- **Conflict resolution**: Master daemon manages resource conflicts and task dependencies

### Real-Time Development
- **Live preview**: WebContainer provides immediate visual feedback
- **Error monitoring**: Browser daemon detects and reports issues automatically
- **Hot reload**: Changes trigger immediate updates in the preview environment

### Intelligent Task Management
- **Auto-analysis**: New tasks are enriched with questions, dependencies, and tags
- **Progressive memory**: Completed work is compressed into searchable knowledge
- **Smart routing**: Tasks are automatically routed to the most appropriate agents

### Security & Safety
- **Risk assessment**: All operations are classified by potential impact
- **Approval gates**: High-risk operations require human confirmation
- **Sandboxed execution**: All code runs in isolated WebContainer environment

## Data Flow

1. **Input**: User provides requirements through any interface
2. **Analysis**: Master daemon analyzes and routes tasks
3. **Decomposition**: Complex tasks are broken into role-specific subtasks
4. **Execution**: Specialized agents execute tasks in coordinated sequence
5. **Feedback**: Browser daemon monitors execution and provides real-time updates
6. **Compression**: Completed work is progressively compressed into memory

## Scalability

- **Horizontal**: Multiple Pi daemons can run simultaneously
- **Vertical**: Individual daemons can be scaled with more powerful hardware
- **Elastic**: Components can be added/removed without system restart
- **Distributed**: Master daemon can coordinate remote agents

## Next Steps

- **[Overview](overview.md)** - Detailed system overview
- **[Components](components.md)** - Deep dive into each component
- **[Task Lifecycle](task-lifecycle.md)** - Follow a task from creation to completion
- **[API Reference](../api/README.md)** - Integration and development APIs