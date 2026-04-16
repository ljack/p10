# Memory System Architecture

P10's four-tier progressive knowledge compression system for long-term project memory.

## Overview

The memory system prevents information overload by automatically compressing completed work into searchable knowledge that informs future tasks.

```
Active Board (≤30 tasks)
        │
        ▼ (30 min after completion)
    Archive (7 days, full data)
        │
        ▼ (3+ related archives)
    Memory (AI summaries)
        │
        ▼ (5+ related memories)
   Reflection (project insights)
```

## Four Tiers

### Tier 1: Active Board
**Retention:** Current work  
**Capacity:** ≤30 tasks  
**Content:** Full task data

Active tasks in the Kanban board with complete details:
- Title, description, priority
- Assigned agent, status, result
- Created/updated timestamps
- Tags and dependencies

### Tier 2: Archive
**Retention:** 7 days  
**Capacity:** Unlimited  
**Content:** Full task + result data

Completed tasks moved from board after 30 minutes:
```typescript
interface ArchivedTask {
  id: string;
  originalTaskId: string;
  title: string;
  description: string;
  priority: string;
  tags: string[];
  result: string;
  artifacts: string[];     // Files created/modified
  duration: number;
  completedAt: Date;
  archivedAt: Date;
  agent: string;
  model: string;
}
```

### Tier 3: Memory
**Retention:** Indefinite  
**Capacity:** Unlimited  
**Content:** AI-generated summaries

Created when 3+ related archives exist:
```typescript
interface Memory {
  id: string;
  title: string;           // AI-generated title
  summary: string;         // AI-generated summary
  insights: string[];      // Key learnings
  tags: string[];          // Aggregated tags
  sourceArchives: string[];
  createdAt: Date;
  relevanceScore: number;
}
```

### Tier 4: Reflection
**Retention:** Permanent  
**Capacity:** Unlimited  
**Content:** Distilled project knowledge

Created when 5+ related memories exist:
```typescript
interface Reflection {
  id: string;
  title: string;           // High-level topic
  knowledge: string;       // Distilled insights
  patterns: string[];      // Recurring patterns
  recommendations: string[];
  sourceMemories: string[];
  createdAt: Date;
  importance: 'low' | 'medium' | 'high';
}
```

## Compression Process

### Archive Compression
When archives share tags or topics, AI summarizes them:

```
Input: 3 archives about "authentication"
├── Archive 1: "Built login endpoint"
├── Archive 2: "Added JWT middleware"
└── Archive 3: "Created protected routes"

AI Prompt:
"Summarize these related tasks into a cohesive memory.
Include key decisions, patterns, and learnings."

Output: Memory
├── Title: "Authentication System Implementation"
├── Summary: "Implemented JWT-based auth with login..."
├── Insights: ["Token refresh pattern", "Middleware approach"]
└── Tags: ["auth", "jwt", "security"]
```

### Memory Compression
When memories share themes, AI creates reflections:

```
Input: 5 memories about "API development"
├── Memory: "Authentication System"
├── Memory: "Todo CRUD Operations"
├── Memory: "User Management APIs"
├── Memory: "Error Handling Patterns"
└── Memory: "Validation Middleware"

AI Prompt:
"Distill these memories into project-level knowledge.
Identify patterns, best practices, and recommendations."

Output: Reflection
├── Title: "API Development Best Practices"
├── Knowledge: "The project follows RESTful conventions..."
├── Patterns: ["Middleware-first validation", "Consistent error format"]
└── Recommendations: ["Always validate input", "Use typed responses"]
```

## Context Injection

### Task Analyst Integration
When enriching new tasks, the analyst searches memories:

```typescript
async function enrichTask(task: Task): Promise<EnrichedTask> {
  // Search relevant memories
  const memories = await searchMemories(task.title, task.description);
  
  // Include in analyst prompt
  const prompt = `
    Analyze this task: "${task.title}"
    
    Relevant past work:
    ${memories.map(m => `- ${m.title}: ${m.summary}`).join('\n')}
    
    Based on this context, suggest:
    1. Clarifying questions
    2. Potential dependencies
    3. Implementation approach
    4. Relevant tags
  `;
  
  return await analyzeWithLLM(prompt);
}
```

### Pipeline Context
Pipelines receive memory context for informed decomposition:

```typescript
async function decomposePipeline(instruction: string): Promise<Task[]> {
  const reflections = await getRelevantReflections(instruction);
  
  const prompt = `
    Decompose: "${instruction}"
    
    Project knowledge:
    ${reflections.map(r => r.knowledge).join('\n\n')}
    
    Use these patterns and avoid past mistakes.
  `;
  
  return await decomposeWithLLM(prompt);
}
```

## Search & Retrieval

### Semantic Search
```typescript
async function searchMemories(query: string): Promise<Memory[]> {
  // Search all tiers
  const archives = await searchArchives(query);
  const memories = await searchMemoriesTier(query);
  const reflections = await searchReflections(query);
  
  // Rank by relevance
  return rankByRelevance([...archives, ...memories, ...reflections]);
}
```

### Navigation
Each tier links to its sources:
```
Reflection → sourceMemories → sourceArchives → originalTask
```

API for drilling down:
```bash
GET /board/memory/:id
# Returns node + children + path to root
```

## Rebirth System

Any archived knowledge can be recreated as a new task:

```typescript
async function rebirthFromMemory(memoryId: string): Promise<Task> {
  const memory = await getMemory(memoryId);
  
  return {
    title: `Revisit: ${memory.title}`,
    description: `Based on past work:\n${memory.summary}`,
    tags: memory.tags,
    priority: 'normal',
    sourceMemory: memoryId
  };
}
```

```bash
POST /board/memory/rebirth/:id
# Creates new planned task from archived knowledge
```

## Grooming Agent

Automated board maintenance:

```typescript
interface GroomingConfig {
  maxBoardTasks: 30;
  archiveAfterMinutes: 30;
  memoryThreshold: 3;      // Archives needed for memory
  reflectionThreshold: 5;  // Memories needed for reflection
  groomingInterval: 300;   // Run every 5 minutes
}

async function groomBoard(): Promise<GroomingResult> {
  // 1. Archive old completed tasks
  const archived = await archiveOldTasks();
  
  // 2. Compress related archives into memories
  const memories = await compressArchives();
  
  // 3. Compress related memories into reflections
  const reflections = await compressMemories();
  
  // 4. Clean up orphaned data
  await cleanupOrphans();
  
  return { archived, memories, reflections };
}
```

## Storage

### Data Structure
```
data/
├── board.json           # Active board state
├── archives/
│   └── YYYY-MM/        # Monthly archive folders
│       └── archive-{id}.json
├── memories/
│   └── memory-{id}.json
├── reflections/
│   └── reflection-{id}.json
└── memory-index.json    # Search index
```

### Persistence
- Board: Persisted on every change
- Archives: Written on archival
- Memories/Reflections: Written on creation
- Index: Updated after each compression

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/board/memory` | GET | All memory tiers |
| `/board/memory/:id` | GET | Specific node + children |
| `/board/memory/search` | GET | Search all tiers |
| `/board/memory/reflections` | GET | Top-level knowledge |
| `/board/memory/rebirth/:id` | POST | Create task from memory |
| `/board/grooming` | GET | Grooming status |
| `/board/groom` | POST | Force grooming cycle |

## Configuration

```typescript
const MEMORY_CONFIG = {
  // Archival timing
  archiveDelayMinutes: 30,
  archiveRetentionDays: 7,
  
  // Compression thresholds
  archivesForMemory: 3,
  memoriesForReflection: 5,
  
  // Search settings
  maxSearchResults: 20,
  relevanceThreshold: 0.5,
  
  // Grooming schedule
  groomingIntervalSeconds: 300,
  maxBoardTasks: 30
};
```

## Benefits

1. **Prevents Overload** - Board stays manageable with ≤30 tasks
2. **Preserves Knowledge** - Nothing is lost, just compressed
3. **Informs Future Work** - Past learnings guide new tasks
4. **Enables Search** - Find relevant past work easily
5. **Supports Rebirth** - Bring back archived work when needed

## Next Steps

- **[Task Lifecycle](task-lifecycle.md)** - How tasks flow through the system
- **[Pipeline System](pipelines.md)** - Multi-agent orchestration
- **[Components](components.md)** - Daemon architecture