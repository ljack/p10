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
  const { AuthStorage, ModelRegistry, SessionManager, createAgentSession } = await import('@mariozechner/pi-coding-agent');
  
  const authStorage = AuthStorage.create();
  const modelRegistry = ModelRegistry.create(authStorage);
  
  // Get available models
  const available = await modelRegistry.getAvailable();
  if (available.length === 0) {
    throw new Error('No LLM models available — check API keys');
  }

  const { session } = await createAgentSession({
    sessionManager: SessionManager.inMemory(),
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
    const lastMessage: any = messages[messages.length - 1];
    
    let response = '';
    if (typeof lastMessage?.content === 'string') {
      response = lastMessage.content;
    } else if (Array.isArray(lastMessage?.content)) {
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
    
    // Convert to PipelineTask objects with chained dependencies
    const tasks: PipelineTask[] = [];
    for (const spec of taskSpecs) {
      tasks.push({
        id: makeId(),
        role: spec.role as AgentRole,
        instruction: spec.instruction,
        status: 'pending' as const,
        dependsOn: tasks.length > 0 ? [tasks[tasks.length - 1].id] : undefined
      });
    }

    return tasks;
    
  } catch (error: any) {
    throw new Error(`LLM decomposition failed: ${error.message}`);
  } finally {
    session.dispose();
  }
}

/**
 * Assign an agent role based on task content (keyword heuristic, no LLM needed)
 */
function assignRole(text: string): AgentRole {
  const t = text.toLowerCase();

  const apiKeywords = ['api', 'endpoint', 'route', 'backend', 'server', 'express',
    'database', 'db', 'middleware', 'rest', 'crud', 'migration', 'schema', 'sql'];
  const webKeywords = ['component', 'ui', 'form', 'page', 'frontend', 'style', 'css',
    'react', 'svelte', 'html', 'layout', 'button', 'modal', 'responsive', 'theme'];
  const reviewKeywords = ['test', 'verify', 'check', 'review', 'fix', 'debug',
    'validate', 'e2e', 'coverage', 'lint', 'audit'];
  const planKeywords = ['plan', 'spec', 'design', 'architecture', 'document',
    'rfc', 'proposal', 'research', 'investigate'];

  const score = (keywords: string[]) => keywords.filter(k => t.includes(k)).length;

  const scores: [AgentRole, number][] = [
    ['api_agent', score(apiKeywords)],
    ['web_agent', score(webKeywords)],
    ['review_agent', score(reviewKeywords)],
    ['planning_agent', score(planKeywords)],
  ];

  scores.sort((a, b) => b[1] - a[1]);
  return scores[0][1] > 0 ? scores[0][0] : 'api_agent'; // default to api_agent
}

/**
 * Build a smart dependency graph:
 * - planning_agent first (no deps)
 * - api_agent tasks chain among themselves
 * - web_agent tasks chain among themselves, depend on last api_agent task
 * - review_agent last, depends on all others
 */
function buildDependencies(tasks: PipelineTask[]): void {
  let lastApi: string | undefined;
  let lastWeb: string | undefined;
  let lastPlanning: string | undefined;
  const allNonReview: string[] = [];

  // First pass: chain within same role, track last of each
  for (const task of tasks) {
    switch (task.role) {
      case 'planning_agent':
        if (lastPlanning) task.dependsOn = [lastPlanning];
        lastPlanning = task.id;
        allNonReview.push(task.id);
        break;
      case 'api_agent':
        // Depends on last planning or last api task
        if (lastApi) task.dependsOn = [lastApi];
        else if (lastPlanning) task.dependsOn = [lastPlanning];
        lastApi = task.id;
        allNonReview.push(task.id);
        break;
      case 'web_agent':
        // Depends on last web task, or last api task (backend must be ready)
        if (lastWeb) task.dependsOn = [lastWeb];
        else if (lastApi) task.dependsOn = [lastApi];
        else if (lastPlanning) task.dependsOn = [lastPlanning];
        lastWeb = task.id;
        allNonReview.push(task.id);
        break;
      case 'review_agent':
        // Depends on all non-review tasks
        if (allNonReview.length > 0) {
          task.dependsOn = [allNonReview[allNonReview.length - 1]];
        }
        break;
    }
  }
}

/**
 * Plan-driven decomposition — reads PLAN.md unchecked items, assigns roles by content
 */
export async function decomposeFromPlan(instruction: string, planContent?: string): Promise<PipelineTask[]> {
  // Load PLAN.md if not provided
  let content = planContent;
  if (!content) {
    const { readFileSync, existsSync } = await import('fs');
    const { join } = await import('path');
    const projectDir = process.env.P10_PROJECT_DIR || join(import.meta.dirname, '..', '..');
    const planPath = join(projectDir, 'PLAN.md');
    if (!existsSync(planPath)) return [];
    content = readFileSync(planPath, 'utf-8');
  }

  // Parse unchecked items: - [ ] task text
  const lines = content.split('\n');
  const unchecked: { title: string; phase: string }[] = [];
  let currentPhase = '';

  for (const line of lines) {
    const phaseMatch = line.match(/^##\s+(.+)/);
    if (phaseMatch) {
      currentPhase = phaseMatch[1].trim();
      continue;
    }
    const taskMatch = line.match(/^-\s+\[ \]\s+(.+)/);
    if (taskMatch) {
      unchecked.push({ title: taskMatch[1].trim(), phase: currentPhase });
    }
  }

  if (unchecked.length === 0) return [];

  // Filter to items matching the instruction (if specific), or take all
  const instructionLower = instruction.toLowerCase();
  let items = unchecked;
  if (!instructionLower.includes('plan') && !instructionLower.includes('all')) {
    // Try to find items that match the instruction keywords
    const keywords = instructionLower.split(/\s+/).filter(w => w.length > 3);
    const matching = unchecked.filter(item =>
      keywords.some(k => item.title.toLowerCase().includes(k))
    );
    if (matching.length > 0) items = matching;
  }

  // Convert to pipeline tasks with role assignment
  const tasks: PipelineTask[] = items.map(item => ({
    id: makeId(),
    role: assignRole(item.title),
    instruction: item.title,
    status: 'pending' as const,
  }));

  // Sort: planning → api → web → review
  const roleOrder: Record<AgentRole, number> = {
    planning_agent: 0, api_agent: 1, web_agent: 2, review_agent: 3,
  };
  tasks.sort((a, b) => roleOrder[a.role] - roleOrder[b.role]);

  // Build smart dependencies
  buildDependencies(tasks);

  console.log(`[decomposer] Plan-driven: ${tasks.length} tasks from PLAN.md`);
  return tasks;
}

/**
 * Main decomposition entry point
 */
export async function decompose(instruction: string): Promise<TaskPipeline> {
  const complexity = classifyComplexity(instruction);
  const pipelineId = makeId();
  
  console.log(`[decomposer] Processing "${instruction}" as ${complexity} task`);
  
  // For complex tasks, try plan-driven first, fall back to LLM
  let tasks: PipelineTask[] = [];
  let approach: TaskPipeline['approach'] = 'decomposed';

  if (complexity === 'complex') {
    try {
      tasks = await decomposeFromPlan(instruction);
      if (tasks.length > 0) approach = 'plan-driven';
    } catch (err: any) {
      console.log(`[decomposer] Plan-driven failed: ${err.message}, falling back to LLM`);
    }
  }

  if (tasks.length === 0) {
    try {
      tasks = await decomposeWithLLM(instruction);
    } catch (err: any) {
      console.log(`[decomposer] LLM decomposition failed: ${err.message}, using single-task fallback`);
      // Fallback: create a single task with auto-assigned role
      tasks = [{
        id: makeId(),
        role: assignRole(instruction),
        instruction,
        status: 'pending',
      }];
      approach = 'direct';
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