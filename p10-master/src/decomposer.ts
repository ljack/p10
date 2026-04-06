/**
 * Task Decomposer — Breaks down user instructions into task pipelines
 * For Sprint M1: MVP 3 Multi-Agent Orchestration
 */

import { makeId } from './types.js';

export type AgentRole = 'planning_agent' | 'api_agent' | 'web_agent' | 'review_agent';

export interface PipelineTask {
  id: string;
  role: AgentRole;               // Which agent role executes this
  instruction: string;           // Task-specific instruction
  context?: string;              // Files/artifacts to include
  dependsOn?: string[];          // Task IDs that must complete first
  status: 'pending' | 'active' | 'completed' | 'failed' | 'skipped';
  result?: string;
}

export interface TaskPipeline {
  id: string;
  instruction: string;           // Original user request
  approach: 'direct' | 'decomposed' | 'plan-driven';
  tasks: PipelineTask[];
  status: 'planning' | 'executing' | 'completed' | 'failed';
  currentTaskIndex: number;
  createdAt: string;
  completedAt?: string;
}

/**
 * Complexity heuristic to determine decomposition approach
 */
export function classifyComplexity(instruction: string): 'simple' | 'complex' {
  const cleanInstruction = instruction.trim().toLowerCase();
  const words = cleanInstruction.split(/\s+/).length;

  // Simple: ≤10 words, single concern
  if (words <= 10 && !hasComplexKeywords(cleanInstruction)) {
    return 'simple';
  }

  // Complex: multiple features, mentions architecture, or has PLAN.md ready
  return 'complex';
}

function hasComplexKeywords(instruction: string): boolean {
  const complexKeywords = [
    'architecture', 'microservice', 'database', 'auth', 'authentication',
    'authorization', 'api', 'endpoints', 'backend', 'frontend', 'fullstack',
    'deploy', 'deployment', 'testing', 'ci/cd', 'pipeline', 'docker',
    'kubernetes', 'scale', 'load balancer', 'cache', 'redis', 'mongodb',
    'postgresql', 'mysql', 'queue', 'webhook', 'socket', 'real-time'
  ];

  return complexKeywords.some(keyword => instruction.includes(keyword));
}

/**
 * LLM-based task decomposition for simple requests
 */
export async function decomposeWithLLM(instruction: string): Promise<PipelineTask[]> {
  const { AuthStorage, ModelRegistry, createAgentSession } = await import('@mariozechner/pi-coding-agent');
  
  const authStorage = AuthStorage.create();
  const modelRegistry = ModelRegistry.create(authStorage);
  
  // Get available models
  const available = await modelRegistry.getAvailable();
  if (available.length === 0) {
    throw new Error('No LLM models available — check API keys');
  }

  const { session } = await createAgentSession({
    sessionManager: { inMemory: () => ({ memory: new Map() }) } as any,
    authStorage,
    modelRegistry,
    tools: [], // No tools needed for decomposition
  });

  const systemPrompt = `You are a task decomposer. Given a user request, break it into ordered sub-tasks for these agent roles:

- api_agent: Backend development (Express routes, middleware, database operations)
- web_agent: Frontend development (React components, forms, routing, styling)  
- review_agent: Testing and verification (endpoint testing, UI verification, error checking)

Output ONLY a JSON array of {role, instruction} objects. API tasks should come before Web tasks. Keep it to 3-6 tasks. Be specific and actionable.

Example for "Build auth":
[
  { "role": "api_agent", "instruction": "Create auth endpoints: POST /api/auth/register, POST /api/auth/login. Use in-memory user store. Hash passwords. Return JWT tokens." },
  { "role": "api_agent", "instruction": "Add auth middleware that verifies JWT from Authorization header." },
  { "role": "web_agent", "instruction": "Create a login form with email/password fields. On submit, POST to /api/auth/login. Store token in localStorage." },
  { "role": "web_agent", "instruction": "Create a registration form. On submit, POST to /api/auth/register. Redirect to login on success." },
  { "role": "web_agent", "instruction": "Add protected route wrapper. Redirect to login if no token." },
  { "role": "review_agent", "instruction": "Verify the auth flow: register a user, login, access protected route." }
]`;

  try {
    await session.prompt(`${systemPrompt}\n\nUser request: "${instruction}"`);
    
    // Extract the JSON from the response
    const messages = session.messages;
    const lastMessage = messages[messages.length - 1];
    
    let response = '';
    if (typeof lastMessage.content === 'string') {
      response = lastMessage.content;
    } else if (Array.isArray(lastMessage.content)) {
      response = lastMessage.content
        .filter((c: any) => c.type === 'text')
        .map((c: any) => c.text)
        .join('\n');
    }

    // Extract JSON array from the response
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Could not extract JSON array from LLM response');
    }

    const taskSpecs = JSON.parse(jsonMatch[0]);
    
    // Convert to PipelineTask objects
    const tasks: PipelineTask[] = taskSpecs.map((spec: any, index: number) => ({
      id: makeId(),
      role: spec.role as AgentRole,
      instruction: spec.instruction,
      status: 'pending' as const,
      dependsOn: index > 0 ? [taskSpecs[index - 1].id] : undefined
    }));

    return tasks;
    
  } catch (error: any) {
    throw new Error(`LLM decomposition failed: ${error.message}`);
  } finally {
    session.dispose();
  }
}

/**
 * Plan-driven decomposition (reads PLAN.md from spec manager)
 */
export async function decomposeFromPlan(instruction: string, planContent?: string): Promise<PipelineTask[]> {
  // For now, return empty array — this will be implemented when we have a spec manager
  // TODO: Parse PLAN.md checkboxes into tasks, assign roles based on content
  return [];
}

/**
 * Main decomposition entry point
 */
export async function decompose(instruction: string): Promise<TaskPipeline> {
  const complexity = classifyComplexity(instruction);
  const pipelineId = makeId();
  
  console.log(`[decomposer] Processing "${instruction}" as ${complexity} task`);
  
  let tasks: PipelineTask[];
  let approach: TaskPipeline['approach'];

  if (complexity === 'simple') {
    tasks = await decomposeWithLLM(instruction);
    approach = 'decomposed';
  } else {
    // For complex tasks, try plan-driven first, fall back to LLM
    tasks = await decomposeFromPlan(instruction);
    if (tasks.length === 0) {
      tasks = await decomposeWithLLM(instruction);
      approach = 'decomposed';
    } else {
      approach = 'plan-driven';
    }
  }

  const pipeline: TaskPipeline = {
    id: pipelineId,
    instruction,
    approach,
    tasks,
    status: 'planning',
    currentTaskIndex: 0,
    createdAt: new Date().toISOString()
  };

  console.log(`[decomposer] Created pipeline with ${tasks.length} tasks:`, 
    tasks.map(t => `${t.role}: ${t.instruction.slice(0, 50)}`));

  return pipeline;
}