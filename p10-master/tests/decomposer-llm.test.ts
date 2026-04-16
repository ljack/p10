import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { startMaster, type TestMaster } from './helper.ts';

describe('LLM Decomposer Bug Investigation', () => {

	it('should detect platform vs user-project context correctly', async () => {
		const { getProjectContext } = await import('../src/decomposer.ts');

		// User project contexts
		assert.strictEqual(getProjectContext('Build a todo app with API backend'), 'user-project');
		assert.strictEqual(getProjectContext('Create a blog with posts and comments'), 'user-project');
		assert.strictEqual(getProjectContext('Add authentication to my app'), 'user-project');
		assert.strictEqual(getProjectContext('Fix the login bug'), 'user-project');

		// Platform contexts
		assert.strictEqual(getProjectContext('Deploy P10 platform'), 'platform');
		assert.strictEqual(getProjectContext('Documentation site: architecture, API reference, setup guide'), 'platform');
		assert.strictEqual(getProjectContext('Production deployment pipeline: packaging, process management'), 'platform');
		assert.strictEqual(getProjectContext('P10 mesh improvements'), 'platform');
		assert.strictEqual(getProjectContext('Add daemon monitoring'), 'platform');
	});
	let master: TestMaster;

	before(async () => {
		master = await startMaster();
	});

	after(() => {
		master?.cleanup();
	});

	it('should decompose "Build a todo app with API backend" into relevant tasks', async () => {
		const { decomposeWithLLM } = await import('../src/decomposer.ts');

		try {
			const tasks = await decomposeWithLLM('Build a todo app with API backend');
			
			// Should have 3-10 tasks (planning + api + web + review)
			assert.ok(tasks.length >= 3 && tasks.length <= 10, `Expected 3-10 tasks, got ${tasks.length}`);
			
			// Should have actual todo-related instructions, not generic ones
			const instructions = tasks.map(t => t.instruction.toLowerCase());
			
			// Check for todo-specific keywords in the instructions
			const hasTodoKeywords = instructions.some(inst => 
				inst.includes('todo') || 
				inst.includes('task') ||
				inst.includes('item') ||
				inst.includes('crud')
			);
			assert.ok(hasTodoKeywords, `Tasks should mention todo/task/crud. Got: ${JSON.stringify(instructions, null, 2)}`);
			
			// Should NOT have generic template responses
			const hasGenericDocumentation = instructions.some(inst => 
				inst.includes('documentation site') ||
				inst.includes('api reference') ||
				inst.includes('setup guide')
			);
			assert.ok(!hasGenericDocumentation, `Tasks should not be generic documentation. Got: ${JSON.stringify(instructions, null, 2)}`);
			
			const hasGenericDeployment = instructions.some(inst => 
				inst.includes('production deployment pipeline') ||
				inst.includes('packaging, process management')
			);
			assert.ok(!hasGenericDeployment, `Tasks should not be generic deployment. Got: ${JSON.stringify(instructions, null, 2)}`);
			
			// Should have proper role distribution
			const roles = tasks.map(t => t.role);
			assert.ok(roles.includes('api_agent'), 'Should have API tasks for backend');
			assert.ok(roles.includes('web_agent'), 'Should have Web tasks for frontend');
			
			console.log('✅ LLM decomposition working correctly:', 
				tasks.map(t => `${t.role}: ${t.instruction}`));
				
		} catch (error: any) {
			// If LLM is unavailable or API key missing, skip gracefully
			if (error.message.includes('No LLM models available') || error.message.includes('API key') || error.message.includes('empty response')) {
				console.log(`⚠️ LLM not available for testing - skipping (${error.message})`);
				return;
			}
			throw error;
		}
	});

	it('should generate task-specific instructions for different domains', async () => {
		const { decomposeWithLLM } = await import('../src/decomposer.ts');
		
		const testCases = [
			{
				input: 'Build a blog with posts and comments',
				expectedKeywords: ['blog', 'post', 'comment'],
				unexpectedKeywords: ['todo', 'documentation site']
			},
			{
				input: 'Create user authentication system',
				expectedKeywords: ['auth', 'login', 'register', 'user'],
				unexpectedKeywords: ['todo', 'blog', 'deployment pipeline']
			}
		];

		for (const testCase of testCases) {
			try {
				const tasks = await decomposeWithLLM(testCase.input);
				const instructions = tasks.map(t => t.instruction.toLowerCase());
				const allText = instructions.join(' ');
				
				// Check for expected domain-specific keywords
				const hasExpectedKeywords = testCase.expectedKeywords.some(keyword => 
					allText.includes(keyword)
				);
				assert.ok(hasExpectedKeywords, 
					`"${testCase.input}" should contain ${testCase.expectedKeywords.join(' or ')}. Got: ${JSON.stringify(instructions)}`);
				
				// Check for unexpected cross-domain contamination
				const hasUnexpectedKeywords = testCase.unexpectedKeywords.some(keyword => 
					allText.includes(keyword)
				);
				assert.ok(!hasUnexpectedKeywords, 
					`"${testCase.input}" should not contain ${testCase.unexpectedKeywords.join(' or ')}. Got: ${JSON.stringify(instructions)}`);
					
			} catch (error: any) {
				if (error.message.includes('No LLM models available') || error.message.includes('API key') || error.message.includes('empty response')) {
					console.log(`⚠️ LLM not available for testing "${testCase.input}" - skipping (${error.message})`);
					continue;
				}
				throw error;
			}
		}
	});

	it('full pipeline decomposition should use instruction-specific tasks', async () => {
		const { decompose } = await import('../src/decomposer.ts');
		
		try {
			const pipeline = await decompose('Build a todo app with API backend');
			
			assert.strictEqual(pipeline.instruction, 'Build a todo app with API backend');
			assert.ok(pipeline.tasks.length > 0, 'Should have tasks');
			
			// After fix: user projects should use LLM decomposition, not plan-driven
			const instructions = pipeline.tasks.map(t => t.instruction.toLowerCase());
			
			// Should NOT have generic platform tasks
			const hasGenericPlatformTasks = instructions.some(inst => 
				inst.includes('documentation site') ||
				inst.includes('production deployment pipeline')
			);
			assert.ok(!hasGenericPlatformTasks, 
				`Should not have generic platform tasks. Got: ${JSON.stringify(instructions)}`);
			
			// Should have todo-related content
			const hasRelevantContent = instructions.some(inst => 
				inst.includes('todo') || 
				inst.includes('api') ||
				inst.includes('backend') ||
				inst.includes('crud')
			) || instructions[0] === 'build a todo app with api backend'; // fallback to direct
			
			assert.ok(hasRelevantContent, 
				`Tasks should be relevant to todos/API. Got: ${JSON.stringify(instructions)}`);
			
			// Should use LLM approach for user projects, not plan-driven
			assert.notStrictEqual(pipeline.approach, 'plan-driven', 
				'User projects should not use plan-driven approach');
			
			console.log(`✅ Fixed! Pipeline approach: ${pipeline.approach}, tasks:`, 
				pipeline.tasks.map(t => `${t.role}: ${t.instruction.slice(0, 60)}...`));
				
		} catch (error: any) {
			if (error.message.includes('No LLM models available')) {
				console.log('⚠️ LLM not available for testing - skipping');
				return;
			}
			throw error;
		}
	});
});