<script lang="ts">
	import { tick } from 'svelte';

	interface Message {
		role: 'user' | 'assistant';
		content: string;
		timestamp: Date;
		isStreaming?: boolean;
	}

	const simulatedResponses: Record<string, string> = {
		todo: `Great choice! I'll build a todo app for you. Let me plan the architecture:

**Backend (API)**
- \`POST /api/todos\` — Create a new todo
- \`GET /api/todos\` — List all todos
- \`PATCH /api/todos/:id\` — Toggle complete / update text
- \`DELETE /api/todos/:id\` — Delete a todo

**Frontend (React)**
- \`TodoList\` component — renders the list with filters
- \`TodoItem\` component — single todo with checkbox, edit, delete
- \`AddTodo\` component — input field with add button
- \`FilterBar\` component — All / Active / Completed

**Data Model**
\`\`\`typescript
interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
}
\`\`\`

I'll start with the backend API using Express, then build the React frontend. Want me to proceed?`,

		auth: `I'll implement a full authentication flow. Here's the plan:

**Endpoints**
- \`POST /api/auth/register\` — Create account (email + password)
- \`POST /api/auth/login\` — Login, returns JWT + refresh token
- \`POST /api/auth/refresh\` — Refresh expired access token
- \`POST /api/auth/logout\` — Invalidate refresh token
- \`GET /api/auth/me\` — Get current user profile

**Security**
- Passwords hashed with bcrypt (12 rounds)
- JWT access tokens (15min expiry)
- HTTP-only refresh tokens (7day expiry)
- Rate limiting on login endpoint

**Frontend**
- Login page with email/password form
- Register page with validation
- Protected route wrapper component
- Auth context with token management

Setting up the auth module now...

📁 Creating \`src/routes/auth.ts\`
📁 Creating \`src/middleware/authenticate.ts\`
📁 Creating \`src/models/User.ts\`

✅ Auth endpoints created and tested.`,

		database: `Let me set up the database layer. I'll use SQLite for development with an abstraction that can swap to PostgreSQL later.

**Schema**
\`\`\`sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE todos (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  text TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
\`\`\`

**Files**
📁 \`src/db/schema.ts\` — Table definitions
📁 \`src/db/migrate.ts\` — Migration runner
📁 \`src/db/connection.ts\` — Database connection pool

Running migrations... ✅
Seeding test data... ✅

Database is ready. 3 sample todos created for testing.`,

		test: `Running the test suite now...

\`\`\`
 PASS  src/routes/auth.test.ts
  ✅ POST /api/auth/register — creates user (45ms)
  ✅ POST /api/auth/register — rejects duplicate email (12ms)
  ✅ POST /api/auth/login — returns JWT token (38ms)
  ✅ POST /api/auth/login — rejects wrong password (15ms)
  ✅ GET /api/auth/me — returns user profile (22ms)
  ✅ GET /api/auth/me — rejects invalid token (8ms)

 PASS  src/routes/todos.test.ts
  ✅ GET /api/todos — returns empty list (18ms)
  ✅ POST /api/todos — creates todo (25ms)
  ✅ PATCH /api/todos/:id — toggles completed (20ms)
  ✅ DELETE /api/todos/:id — removes todo (15ms)
  ✅ GET /api/todos — filters by completed status (22ms)

 PASS  src/components/TodoList.test.tsx
  ✅ renders todo items (52ms)
  ✅ toggles todo on click (35ms)
  ✅ adds new todo (40ms)
  ✅ deletes todo (28ms)

Tests:  15 passed, 0 failed
Time:   1.24s
Coverage: 87% statements, 92% branches
\`\`\`

All tests passing! Coverage is at 87%. Want me to add more edge case tests?`
	};

	const defaultResponse = `I understand. Let me think about how to approach this...

I'll break this down into smaller tasks:

1. **Analyze** the requirements
2. **Design** the data model and API
3. **Implement** backend endpoints
4. **Build** the frontend UI
5. **Test** everything end-to-end

Which part would you like me to start with? Or should I go through them all sequentially?`;

	function getSimulatedResponse(input: string): string {
		const lower = input.toLowerCase();
		for (const [keyword, response] of Object.entries(simulatedResponses)) {
			if (lower.includes(keyword)) return response;
		}
		return defaultResponse;
	}

	let messages = $state<Message[]>([
		{
			role: 'assistant',
			content:
				"Welcome to P10. What would you like to build?\n\nTry asking me to:\n• Build a **todo app**\n• Set up **auth**entication\n• Create a **database** schema\n• Run **test**s",
			timestamp: new Date()
		}
	]);

	let input = $state('');
	let isStreaming = $state(false);
	let userHasScrolled = $state(false);

	let messagesContainer: HTMLDivElement;
	let messagesEnd: HTMLDivElement;
	let inputEl: HTMLTextAreaElement;

	function scrollToBottom() {
		if (!userHasScrolled) {
			messagesEnd?.scrollIntoView({ behavior: 'smooth' });
		}
	}

	function handleScroll() {
		if (!messagesContainer) return;
		const distFromBottom =
			messagesContainer.scrollHeight -
			messagesContainer.scrollTop -
			messagesContainer.clientHeight;
		userHasScrolled = distFromBottom > 40;
	}

	function streamResponse(fullText: string) {
		isStreaming = true;

		const newMsg: Message = {
			role: 'assistant',
			content: '',
			timestamp: new Date(),
			isStreaming: true
		};
		messages = [...messages, newMsg];

		let charIndex = 0;
		const speed = 12;

		const interval = setInterval(() => {
			const chunkSize = Math.floor(Math.random() * 4) + 1;
			charIndex = Math.min(charIndex + chunkSize, fullText.length);

			messages = messages.map((m, i) =>
				i === messages.length - 1 ? { ...m, content: fullText.slice(0, charIndex) } : m
			);

			tick().then(scrollToBottom);

			if (charIndex >= fullText.length) {
				clearInterval(interval);
				messages = messages.map((m, i) =>
					i === messages.length - 1 ? { ...m, isStreaming: false } : m
				);
				isStreaming = false;
				userHasScrolled = false;
			}
		}, speed);
	}

	function handleSubmit() {
		const trimmed = input.trim();
		if (!trimmed || isStreaming) return;

		messages = [...messages, { role: 'user', content: trimmed, timestamp: new Date() }];
		input = '';

		tick().then(scrollToBottom);

		setTimeout(
			() => {
				const response = getSimulatedResponse(trimmed);
				streamResponse(response);
			},
			300 + Math.random() * 500
		);
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSubmit();
		}
	}

	// Format timestamp
	function formatTime(d: Date): string {
		return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	}
</script>

<div class="h-full flex flex-col bg-panel-bg border-r border-panel-border">
	<!-- Header -->
	<div class="h-8 flex items-center px-3 border-b border-panel-border shrink-0">
		<span class="text-accent text-xs font-bold">CHAT</span>
		{#if isStreaming}
			<span class="ml-2 text-warning text-xs animate-pulse">● streaming</span>
		{/if}
	</div>

	<!-- Messages -->
	<div
		bind:this={messagesContainer}
		onscroll={handleScroll}
		class="flex-1 overflow-y-auto p-3 space-y-4 min-h-0"
	>
		{#each messages as msg}
			<div class="text-sm leading-relaxed">
				<!-- Role label -->
				<div
					class="text-xs font-bold mb-1 {msg.role === 'user' ? 'text-foreground' : 'text-accent'}"
				>
					{msg.role === 'user' ? 'you' : 'agent'}
					<span class="text-muted font-normal ml-2">{formatTime(msg.timestamp)}</span>
				</div>
				<!-- Content -->
				<div class="pl-2 border-l-2 border-panel-border whitespace-pre-wrap">
					{@html formatContent(msg.content)}
					{#if msg.isStreaming}
						<span class="inline-block w-1.5 h-4 bg-accent animate-pulse ml-0.5 align-middle"
						></span>
					{/if}
				</div>
			</div>
		{/each}
		<div bind:this={messagesEnd}></div>
	</div>

	<!-- Input -->
	<div class="border-t border-panel-border p-2 shrink-0">
		<div class="flex items-end gap-2">
			<span class="text-accent text-sm font-bold pb-1">❯</span>
			<textarea
				bind:this={inputEl}
				bind:value={input}
				onkeydown={handleKeyDown}
				placeholder={isStreaming ? 'Agent is responding...' : 'Type a message...'}
				disabled={isStreaming}
				rows={1}
				class="flex-1 bg-transparent text-foreground text-sm resize-none outline-none placeholder:text-muted disabled:opacity-50"
				style="min-height: 1.5rem; max-height: 6rem;"
			></textarea>
			<button
				onclick={handleSubmit}
				disabled={isStreaming}
				class="text-muted hover:text-accent text-xs transition-colors pb-1 disabled:opacity-30"
			>
				↵
			</button>
		</div>
	</div>
</div>

<script lang="ts" module>
	/** Simple markdown-ish formatter for terminal feel */
	export function formatContent(content: string): string {
		// Escape HTML first
		let html = content
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;');

		// Code blocks ```lang\ncode\n```
		html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_match, lang, code) => {
			const langLabel = lang
				? `<div class="text-xs text-muted px-3 py-1 border-b border-panel-border">${lang}</div>`
				: '';
			return `<div class="my-2 rounded bg-background border border-panel-border overflow-x-auto">${langLabel}<pre class="text-xs p-3 text-foreground"><code>${code}</code></pre></div>`;
		});

		// Inline code `text`
		html = html.replace(
			/`([^`]+)`/g,
			'<code class="bg-background text-accent px-1 py-0.5 rounded text-xs">$1</code>'
		);

		// Bold **text**
		html = html.replace(
			/\*\*([^*]+)\*\*/g,
			'<strong class="text-foreground font-bold">$1</strong>'
		);

		return html;
	}
</script>
