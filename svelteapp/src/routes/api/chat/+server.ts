import { createAnthropic } from '@ai-sdk/anthropic';
import { streamText, convertToModelMessages } from 'ai';
import type { RequestHandler } from './$types';

const SYSTEM_PROMPT = `You are P10, an AI coding assistant that builds web applications.

You have access to a WebContainer — a browser-based Node.js environment running a Vite + React project.

## How to make changes:

To write a file, output a special block:

<tool:write_file path="src/App.jsx">
file content here
</tool:write_file>

To read a file:
<tool:read_file path="src/App.jsx" />

To run a command:
<tool:run_command command="npm install axios" />

To list files:
<tool:list_files path="src" />

The client will parse these blocks and execute them in the WebContainer. The preview hot-reloads automatically.

## Guidelines:
- Write clean, modern React code (functional components, hooks)
- Use JSX files (not TSX) since the WebContainer has a simple Vite + React setup
- Keep it simple — this is a prototype environment
- When creating new files, also update any imports needed
- The project structure starts with: src/App.jsx (main component), src/main.jsx (entry point), index.html
- You can install npm packages using run_command
- Always explain what you're doing before making changes
- After making changes, tell the user what was done and what they should see in the preview
- When writing files, always include the COMPLETE file content — never use placeholders or "..." 
- Output one write_file block per file`;

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const apiKey = body.apiKey as string;
	const rawMessages = body.messages as Array<{ role: string; content: string }>;

	console.log('[api/chat] POST received:', rawMessages.length, 'messages, apiKey:', apiKey ? 'set' : 'missing');

	if (!apiKey) {
		return new Response(JSON.stringify({ error: 'API key required' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const anthropic = createAnthropic({ apiKey });

	const modelMessages = await convertToModelMessages(
		rawMessages.map((m) => ({
			role: m.role as 'user' | 'assistant',
			parts: [{ type: 'text' as const, text: m.content }]
		}))
	);

	const result = streamText({
		model: anthropic('claude-sonnet-4-20250514'),
		system: SYSTEM_PROMPT,
		messages: modelMessages
	});

	return result.toTextStreamResponse();
};
