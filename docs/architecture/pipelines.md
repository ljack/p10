# Pipeline System Architecture

The pipeline system is P10's multi-agent orchestration engine that decomposes complex instructions into role-specific task sequences executed by specialized AI agents.

## Overview

Pipelines transform high-level requirements like "Build authentication system" into structured sequences of specialized tasks that agents can execute efficiently with proper context handoffs.

## Pipeline Lifecycle

```
Instruction → Decomposition → Dependency Analysis → Sequential Execution → Completion
     ↓             ↓              ↓                    ↓              ↓
  "Build auth"  Task Breakdown  Order by Deps     Role Assignment   Results
```

### Phases

1. **Instruction Analysis** - LLM analyzes requirements and complexity
2. **Task Decomposition** - Break into role-specific subtasks  
3. **Dependency Resolution** - Order tasks by logical dependencies
4. **Context Planning** - Determine what context each task needs
5. **Sequential Execution** - Execute tasks with context handoffs
6. **Error Recovery** - Handle failures with review_agent
7. **Result Compilation** - Aggregate outputs into final result

## Decomposition Engine

### LLM-Powered Analysis
The decomposer uses Claude to intelligently break down instructions:

```typescript
interface DecompositionPrompt {
  instruction: string;
  context?: string;
  availableRoles: AgentRole[];
  projectContext: ProjectSnapshot;
}
```

**Decomposer Prompt Template:**
```
You are a technical project manager decomposing software development tasks.

INSTRUCTION: "{instruction}"
CONTEXT: "{context}"

AVAILABLE ROLES:
- planning_agent: Requirements analysis, task breakdown, architecture
- api_agent: Backend development, APIs, database, server-side logic
- web_agent: Frontend development, UI components, styling
- review_agent: Code review, testing, bug fixes, quality assurance

PROJECT CONTEXT:
{projectSnapshot}

Decompose this instruction into a sequence of specific, actionable tasks.
Each task should be assigned to the most appropriate role.
Consider dependencies between tasks and order them logically.

Output format:
{
  "tasks": [
    {
      "agent": "planning_agent",
      "instruction": "Analyze authentication requirements and create implementation plan",
      "dependencies": [],
      "estimatedDuration": "5-10 minutes",
      "context": "Focus on security best practices and user experience"
    }
  ],
  "estimatedTotal": "20-30 minutes",
  "complexity": "medium"
}
```

### Decomposition Examples

**Simple Instruction:**
```
Input: "Fix the login bug"
Output: [
  {
    "agent": "review_agent",
    "instruction": "Investigate and fix the login bug",
    "dependencies": []
  }
]
```

**Medium Instruction:**
```
Input: "Build a todo app"
Output: [
  {
    "agent": "planning_agent", 
    "instruction": "Design todo app architecture and data model"
  },
  {
    "agent": "api_agent",
    "instruction": "Create todo API endpoints (GET, POST, PUT, DELETE)",
    "dependencies": ["planning_agent"]
  },
  {
    "agent": "web_agent", 
    "instruction": "Build todo UI components and forms",
    "dependencies": ["api_agent"]
  },
  {
    "agent": "review_agent",
    "instruction": "Test complete todo functionality",
    "dependencies": ["web_agent"]
  }
]
```

**Complex Instruction:**
```
Input: "Build authentication with login, registration, password reset"
Output: [
  {
    "agent": "planning_agent",
    "instruction": "Design authentication system architecture"
  },
  {
    "agent": "api_agent", 
    "instruction": "Implement user registration endpoint with validation",
    "dependencies": ["planning_agent"]
  },
  {
    "agent": "api_agent",
    "instruction": "Implement login endpoint with JWT tokens", 
    "dependencies": ["planning_agent"]
  },
  {
    "agent": "api_agent",
    "instruction": "Add password reset functionality with email",
    "dependencies": ["planning_agent"]
  },
  {
    "agent": "api_agent",
    "instruction": "Create JWT middleware for protected routes",
    "dependencies": ["login_endpoint"]
  },
  {
    "agent": "web_agent",
    "instruction": "Build registration form with validation",
    "dependencies": ["registration_endpoint"]
  },
  {
    "agent": "web_agent", 
    "instruction": "Build login form and auth state management",
    "dependencies": ["login_endpoint"]
  },
  {
    "agent": "web_agent",
    "instruction": "Build password reset form and flow",
    "dependencies": ["password_reset_endpoint"]
  },
  {
    "agent": "review_agent",
    "instruction": "Test complete authentication flow and security",
    "dependencies": ["all_web_components"]
  }
]
```

## Execution Engine

### Sequential Processing
Tasks execute one at a time with context handoffs:

```typescript
interface TaskExecution {
  id: string;
  pipelineId: string;
  agent: AgentRole;
  instruction: string;
  context: TaskContext;
  status: 'pending' | 'active' | 'completed' | 'failed' | 'skipped';
  result?: string;
  startTime?: Date;
  endTime?: Date;
  dependencies: string[];
}
```

### Context Handoffs
Each task receives context from prior completed tasks:

```typescript
interface TaskContext {
  instruction: string;
  priorResults: {
    [taskId: string]: {
      agent: AgentRole;
      instruction: string;
      result: string;
      artifacts: string[];
    };
  };
  projectSnapshot: ProjectSnapshot;
  pipelineContext: string;
}
```

**Context Assembly:**
```typescript
function assembleTaskContext(task: Task, pipeline: Pipeline): TaskContext {
  const priorResults = {};
  
  // Add results from dependency tasks
  for (const dep of task.dependencies) {
    const depTask = pipeline.tasks.find(t => t.id === dep);
    if (depTask?.status === 'completed') {
      priorResults[dep] = {
        agent: depTask.agent,
        instruction: depTask.instruction,
        result: depTask.result,
        artifacts: depTask.artifacts
      };
    }
  }
  
  return {
    instruction: task.instruction,
    priorResults,
    projectSnapshot: await getProjectSnapshot(),
    pipelineContext: pipeline.context
  };
}
```

### Error Recovery
Failed tasks trigger automatic recovery:

```typescript
async function handleTaskFailure(task: Task, error: TaskError): Promise<void> {
  // Create recovery task with review_agent
  const recoveryTask = {
    agent: 'review_agent',
    instruction: `Fix the error in task: ${task.instruction}`,
    context: {
      originalTask: task,
      error: error.message,
      priorResults: task.context.priorResults,
      debugInfo: error.debugInfo
    },
    priority: 'high',
    isRecovery: true
  };
  
  // Insert recovery task before next task
  pipeline.tasks.splice(task.index + 1, 0, recoveryTask);
  
  // Update pipeline status
  pipeline.status = 'recovering';
  await savePipeline(pipeline);
}
```

## Agent Role System

### Role Definitions
```typescript
interface AgentRole {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  systemPrompt: string;
  preferredModel: string;
  specializations: string[];
}

const AGENT_ROLES: Record<string, AgentRole> = {
  planning_agent: {
    id: 'planning_agent',
    name: 'Planning Agent',
    description: 'Analyzes requirements and creates implementation plans',
    capabilities: ['analysis', 'planning', 'architecture', 'decomposition'],
    systemPrompt: `You are a senior software architect and technical lead...`,
    preferredModel: 'claude-3-sonnet-20240229',
    specializations: ['requirements', 'architecture', 'planning']
  },
  
  api_agent: {
    id: 'api_agent', 
    name: 'API Agent',
    description: 'Builds backend APIs and server-side logic',
    capabilities: ['backend', 'api', 'database', 'server'],
    systemPrompt: `You are an expert backend developer...`,
    preferredModel: 'claude-3-sonnet-20240229',
    specializations: ['express', 'fastify', 'database', 'api-design']
  },
  
  web_agent: {
    id: 'web_agent',
    name: 'Web Agent', 
    description: 'Creates frontend components and user interfaces',
    capabilities: ['frontend', 'react', 'ui', 'styling'],
    systemPrompt: `You are a frontend specialist...`,
    preferredModel: 'claude-3-sonnet-20240229',
    specializations: ['react', 'typescript', 'tailwind', 'ui-design']
  },
  
  review_agent: {
    id: 'review_agent',
    name: 'Review Agent',
    description: 'Reviews code quality and fixes issues',
    capabilities: ['review', 'testing', 'debugging', 'quality'],
    systemPrompt: `You are a code reviewer and QA specialist...`,
    preferredModel: 'claude-3-opus-20240229',
    specializations: ['code-review', 'testing', 'debugging', 'security']
  }
};
```

### Role Assignment Logic
```typescript
function assignOptimalRole(taskDescription: string): AgentRole {
  const keywords = taskDescription.toLowerCase();
  
  // API/Backend keywords
  if (keywords.match(/\b(api|endpoint|backend|server|database|auth|middleware)\b/)) {
    return AGENT_ROLES.api_agent;
  }
  
  // Frontend/UI keywords  
  if (keywords.match(/\b(component|ui|frontend|form|styling|react)\b/)) {
    return AGENT_ROLES.web_agent;
  }
  
  // Review/QA keywords
  if (keywords.match(/\b(test|review|debug|fix|error|bug|quality)\b/)) {
    return AGENT_ROLES.review_agent;
  }
  
  // Planning/Architecture keywords
  if (keywords.match(/\b(plan|design|architect|analyze|structure)\b/)) {
    return AGENT_ROLES.planning_agent;
  }
  
  // Default to planning for ambiguous tasks
  return AGENT_ROLES.planning_agent;
}
```

## Dependency Management

### Dependency Types
- **Sequential**: Task B depends on Task A completion
- **Resource**: Tasks that modify the same files
- **Logical**: Business logic dependencies (login before protected routes)

### Dependency Resolution Algorithm
```typescript
function resolveDependencies(tasks: Task[]): Task[] {
  const graph = buildDependencyGraph(tasks);
  const sorted = topologicalSort(graph);
  
  // Optimize for parallelization where possible
  const optimized = optimizeParallelExecution(sorted);
  
  return optimized;
}

function buildDependencyGraph(tasks: Task[]): DependencyGraph {
  const graph = new Map();
  
  for (const task of tasks) {
    // Explicit dependencies
    for (const dep of task.dependencies) {
      graph.addEdge(dep, task.id);
    }
    
    // Implicit dependencies (same agent role)
    const sameRoleTasks = tasks.filter(t => 
      t.agent === task.agent && t.id !== task.id
    );
    
    for (const sameRoleTask of sameRoleTasks) {
      if (sameRoleTask.createdAt < task.createdAt) {
        graph.addEdge(sameRoleTask.id, task.id);
      }
    }
  }
  
  return graph;
}
```

## Progress Tracking

### Real-Time Updates
```typescript
interface PipelineProgress {
  pipelineId: string;
  status: 'planning' | 'executing' | 'completed' | 'failed' | 'cancelled';
  progress: {
    completed: number;
    total: number;
    percentage: number;
  };
  currentTask?: {
    id: string;
    agent: string;
    instruction: string;
    startTime: Date;
    estimatedCompletion: Date;
  };
  estimatedCompletion: Date;
  actualDuration?: number;
}
```

### Progress Events
```typescript
// Emitted on task state changes
interface TaskProgressEvent {
  type: 'task_started' | 'task_completed' | 'task_failed';
  pipelineId: string;
  taskId: string;
  agent: string;
  progress: PipelineProgress;
  timestamp: Date;
}

// Emitted on pipeline state changes  
interface PipelineProgressEvent {
  type: 'pipeline_started' | 'pipeline_completed' | 'pipeline_failed';
  pipelineId: string;
  status: PipelineStatus;
  result?: string;
  duration: number;
  timestamp: Date;
}
```

## Performance Optimizations

### Parallel Execution (Future)
Currently sequential, but designed for future parallelization:

```typescript
interface ParallelExecutionPlan {
  stages: TaskStage[];
  maxConcurrency: number;
  resourceConflicts: ResourceConflict[];
}

interface TaskStage {
  tasks: Task[];
  dependencies: string[]; // Previous stage IDs
  canRunInParallel: boolean;
}
```

### Caching Strategy
```typescript
interface TaskCache {
  instruction: string;
  context: TaskContext;
  result: string;
  ttl: number;
  hash: string;
}

function getCachedResult(task: Task, context: TaskContext): string | null {
  const hash = hashTaskAndContext(task, context);
  const cached = cache.get(hash);
  
  if (cached && cached.ttl > Date.now()) {
    return cached.result;
  }
  
  return null;
}
```

### Smart Context Pruning
```typescript
function pruneContext(context: TaskContext, task: Task): TaskContext {
  // Only include relevant prior results
  const relevantResults = {};
  
  for (const [taskId, result] of Object.entries(context.priorResults)) {
    if (isRelevantToTask(result, task)) {
      relevantResults[taskId] = result;
    }
  }
  
  return {
    ...context,
    priorResults: relevantResults
  };
}
```

## Error Handling

### Error Categories
```typescript
enum TaskErrorType {
  VALIDATION_ERROR = 'validation_error',
  EXECUTION_ERROR = 'execution_error', 
  TIMEOUT_ERROR = 'timeout_error',
  DEPENDENCY_ERROR = 'dependency_error',
  RESOURCE_ERROR = 'resource_error'
}

interface TaskError {
  type: TaskErrorType;
  message: string;
  details: any;
  recoverable: boolean;
  suggestedAction: string;
}
```

### Recovery Strategies
```typescript
function getRecoveryStrategy(error: TaskError): RecoveryStrategy {
  switch (error.type) {
    case TaskErrorType.VALIDATION_ERROR:
      return {
        action: 'retry_with_review',
        agent: 'review_agent',
        maxAttempts: 2
      };
      
    case TaskErrorType.EXECUTION_ERROR:
      return {
        action: 'debug_and_fix',
        agent: 'review_agent', 
        maxAttempts: 3
      };
      
    case TaskErrorType.TIMEOUT_ERROR:
      return {
        action: 'extend_timeout',
        agent: 'same_agent',
        maxAttempts: 1
      };
      
    default:
      return {
        action: 'fail_pipeline',
        agent: null,
        maxAttempts: 0
      };
  }
}
```

## Integration with Board

### Board Task Creation
Each pipeline creates a board task with subtask tracking:

```typescript
interface PipelineBoardTask {
  id: string;
  title: string; // Original instruction
  description: string;
  type: 'pipeline';
  pipelineId: string;
  subtasks: {
    id: string;
    agent: string;
    instruction: string;
    status: TaskStatus;
    result?: string;
  }[];
  progress: {
    completed: number;
    total: number;
    percentage: number;
  };
}
```

### Real-Time Board Updates
```typescript
function updateBoardProgress(pipeline: Pipeline): void {
  const boardTask = board.getTask(pipeline.boardTaskId);
  
  boardTask.subtasks = pipeline.tasks.map(task => ({
    id: task.id,
    agent: task.agent,
    instruction: task.instruction,
    status: task.status,
    result: task.result
  }));
  
  boardTask.progress = calculateProgress(pipeline);
  
  board.updateTask(boardTask);
  emit('board_updated', { taskId: boardTask.id, progress: boardTask.progress });
}
```

## API Integration

### Pipeline REST Endpoints
- `POST /pipeline` - Launch new pipeline
- `GET /pipeline/:id` - Get pipeline status  
- `GET /pipelines` - List all pipelines
- `POST /pipeline/:id/cancel` - Cancel pipeline
- `POST /pipeline/:id/rerun` - Retry failed pipeline

### WebSocket Events
- `pipeline_started`
- `pipeline_progress` 
- `task_started`
- `task_completed`
- `task_failed`
- `pipeline_completed`
- `pipeline_failed`

## Future Enhancements

### Advanced Features (Planned)
- **Parallel Task Execution** - Run independent tasks simultaneously
- **Dynamic Re-planning** - Adjust pipeline based on intermediate results
- **Cross-Pipeline Dependencies** - Pipeline B waits for Pipeline A completion
- **Template System** - Pre-built pipeline templates for common patterns
- **Smart Retries** - Learn from failures to improve retry strategies
- **Resource Allocation** - Intelligent agent assignment based on load

### Integration Opportunities
- **GitHub Integration** - Create PRs for pipeline results
- **Testing Integration** - Automatic test execution after code generation
- **Deployment Integration** - Deploy successful pipelines automatically
- **Monitoring Integration** - Track pipeline performance metrics

## Next Steps

- **[Task Lifecycle](task-lifecycle.md)** - How individual tasks flow through the system
- **[Memory System](memory.md)** - Knowledge compression and retrieval
- **[Components](components.md)** - Detailed component architecture
- **[API Reference](../api/rest-api.md)** - Pipeline API endpoints and usage