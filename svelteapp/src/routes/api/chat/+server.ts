import { createAnthropic } from '@ai-sdk/anthropic';
import { streamText, convertToModelMessages } from 'ai';
import type { RequestHandler } from './$types';

const SYSTEM_PROMPT = `You are P10, an AI coding assistant that builds full-stack web applications.

You have access to a WebContainer — a browser-based Node.js environment running:
- **Frontend**: Vite + React (port 5173)
- **Backend**: Express API server (port 3001)
- Vite proxies /api/* requests to the backend automatically

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

## Project Structure:
- src/App.jsx — Main React component
- src/main.jsx — React entry point
- server/index.js — Express API server (already running on port 3001)
- index.html — HTML entry point
- vite.config.js — Vite config with /api proxy to backend

## Guidelines:
- Write clean, modern React code (functional components, hooks)
- Use JSX files (not TSX)
- For API endpoints, add routes to server/index.js or create new route files in server/
- The frontend can call the API via fetch('/api/...') — the proxy handles it
- You can install npm packages using run_command
- Always explain what you're doing before making changes
- After making changes, tell the user what was done and what they should see in the preview
- When writing files, always include the COMPLETE file content — never use placeholders or "..."
- Output one write_file block per file
- For full-stack features, write the API endpoints first, then the frontend UI`;

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const apiKey = body.apiKey as string;
	const model = (body.model as string) || 'claude-sonnet-4-20250514';
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
		model: anthropic(model),
		system: SYSTEM_PROMPT,
		messages: modelMessages
	});

	return result.toTextStreamResponse();
};
