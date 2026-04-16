# Decomposer Bug Fix Plan

## 🐛 Problem
When users request "Build a todo app with API backend", the system returns generic P10 platform tasks instead of todo-specific tasks.

**Root Cause**: Plan-driven decomposition reads PLAN.md (which contains P10 platform development tasks) for user project requests.

## 🎯 Solution Strategy

### 1. Context Awareness
Add project vs platform context detection:

```typescript
function getProjectContext(instruction: string): 'platform' | 'user-project' {
  const platformKeywords = [
    'p10', 'platform', 'deployment pipeline', 'documentation site', 
    'mesh', 'daemon', 'master', 'architecture reference'
  ];
  
  const instructionLower = instruction.toLowerCase();
  const isPlatformWork = platformKeywords.some(k => instructionLower.includes(k));
  
  return isPlatformWork ? 'platform' : 'user-project';
}
```

### 2. Plan File Strategy
- **Platform work**: Use `PLAN.md` (P10 system development)
- **User projects**: Use `PROJECT.md` or skip plan-driven entirely

### 3. Improved Fallback Logic
```typescript
if (context === 'user-project') {
  // Skip plan-driven for user projects, go straight to LLM
  tasks = await decomposeWithLLM(instruction);
} else {
  // Platform work can use plan-driven
  tasks = await decomposeFromPlan(instruction);
  if (tasks.length === 0) {
    tasks = await decomposeWithLLM(instruction);
  }
}
```

## 🧪 Test Strategy

### Failing Test (Already Created)
- ✅ `decomposer-llm.test.ts` - Captures the exact bug

### Additional Tests Needed
1. **Context Detection Tests**
   ```typescript
   assert.strictEqual(getProjectContext('Build a todo app'), 'user-project');
   assert.strictEqual(getProjectContext('Deploy P10 platform'), 'platform');
   ```

2. **Plan File Strategy Tests**
   ```typescript
   // User project should skip PLAN.md even if it exists
   // Platform work should use PLAN.md
   ```

## 🔧 Implementation Steps

1. **Add Context Detection** 
   - Implement `getProjectContext()` function
   - Test with various inputs

2. **Modify Decompose Logic**
   - Check context before plan-driven approach
   - Skip plan-driven for user projects

3. **Add Relevance Filtering** 
   - Even if using plan-driven, filter tasks by instruction relevance
   - Fall back to LLM if no relevant tasks found

4. **Validate with Original Bug Case**
   - Run: `"Build a todo app with API backend"`
   - Should generate todo-specific tasks, not platform tasks

## 🎯 Expected Outcome

After fix:
- ✅ `"Build a todo app"` → Todo-specific tasks via LLM
- ✅ `"Deploy P10 platform"` → Platform tasks via PLAN.md  
- ✅ `"Add auth to todo app"` → Auth-specific tasks via LLM
- ✅ `"Implement P10 mesh improvements"` → PLAN.md platform tasks

## 🚨 Risk Mitigation

- Keep existing plan-driven logic for platform development
- Preserve LLM fallback for all cases
- Add comprehensive test coverage
- Backward compatibility maintained

---

**Priority**: High (blocks autonomous development)
**Effort**: Small (2-3 hour fix)
**Impact**: Fixes pipeline decomposition for all user projects