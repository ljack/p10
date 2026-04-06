import { WebContainer } from '@webcontainer/api';

import { errorStore } from '$lib/stores/errors.svelte';
import { debugBus } from '$lib/debug/debugBus.svelte';

// Generate server content to avoid template literal nesting issues
function generateServerContent(): string {
	return [
		"import express from 'express';",
		"import cors from 'cors';",
		"",
		"const app = express();",
		"app.use(cors());",
		"app.use(express.json());",
		"",
		"// Health check",
		"app.get('/api/health', (req, res) => {",
		"  res.json({ status: 'ok', timestamp: new Date().toISOString() });",
		"});",
		"",
		"// Route discovery — lists all registered API endpoints",
		"app.get('/api/_routes', (req, res) => {",
		"  const routes = [];",
		"  app._router.stack.forEach((middleware) => {",
		"    if (middleware.route) {",
		"      const methods = Object.keys(middleware.route.methods).map(m => m.toUpperCase());",
		"      routes.push({ methods, path: middleware.route.path });",
		"    }",
		"  });",
		"  res.json(routes.filter(r => r.path !== '/api/_routes'));",
		"});",
		"",
		"// Sample todos data",
		"let todos = [",
		"  { id: 1, title: 'Learn P10', completed: false },",
		"  { id: 2, title: 'Build an app', completed: false },",
		"  { id: 3, title: 'Deploy to production', completed: false }",
		"];",
		"",
		"// Todos CRUD endpoints",
		"app.get('/api/todos', (req, res) => {",
		"  res.json(todos);",
		"});",
		"",
		"app.post('/api/todos', (req, res) => {",
		"  const newTodo = {",
		"    id: Math.max(...todos.map(t => t.id), 0) + 1,",
		"    title: req.body.title || 'New Todo',",
		"    completed: false",
		"  };",
		"  todos.push(newTodo);",
		"  res.status(201).json(newTodo);",
		"});",
		"",
		"app.put('/api/todos/:id', (req, res) => {",
		"  const id = parseInt(req.params.id);",
		"  const todo = todos.find(t => t.id === id);",
		"  if (!todo) {",
		"    return res.status(404).json({ error: 'Todo not found' });",
		"  }",
		"  if (req.body.title !== undefined) todo.title = req.body.title;",
		"  if (req.body.completed !== undefined) todo.completed = req.body.completed;",
		"  res.json(todo);",
		"});",
		"",
		"app.delete('/api/todos/:id', (req, res) => {",
		"  const id = parseInt(req.params.id);",
		"  const index = todos.findIndex(t => t.id === id);",
		"  if (index === -1) {",
		"    return res.status(404).json({ error: 'Todo not found' });",
		"  }",
		"  const deleted = todos.splice(index, 1)[0];",
		"  res.json(deleted);",
		"});",
		"",
		"// Example endpoint — agent will add more",
		"app.get('/api', (req, res) => {",
		"  res.json({ message: 'P10 API is running. Add endpoints by chatting with the agent.' });",
		"});",
		"",
		"// Error handling middleware",
		"app.use((err, req, res, next) => {",
		"  console.error('Server error:', err);",
		"  res.status(500).json({ error: 'Internal server error', message: err.message });",
		"});",
		"",
		"// 404 handler",
		"app.use((req, res) => {",
		"  console.log('404 - Route not found:', req.method, req.url);",
		"  res.status(404).json({ error: 'Route not found', method: req.method, url: req.url });",
		"});",
		"",
		"const BASE_PORT = 3001;",
		"const MAX_PORT_ATTEMPTS = 10;",
		"",
		"function findAvailablePort(startPort) {",
		"  return new Promise((resolve, reject) => {",
		"    let port = startPort;",
		"    let attempts = 0;",
		"",
		"    function tryPort(currentPort) {",
		"      if (attempts >= MAX_PORT_ATTEMPTS) {",
		"        reject(new Error('No available ports found after ' + MAX_PORT_ATTEMPTS + ' attempts'));",
		"        return;",
		"      }",
		"",
		"      const server = app.listen(currentPort, () => {",
		"        console.log('API server running on http://localhost:' + currentPort);",
		"        console.log('Available endpoints:');",
		"        console.log('   GET    /api/health');",
		"        console.log('   GET    /api/_routes');",
		"        console.log('   GET    /api/todos');",
		"        console.log('   POST   /api/todos');",
		"        console.log('   PUT    /api/todos/:id');",
		"        console.log('   DELETE /api/todos/:id');",
		"        resolve({ server, port: currentPort });",
		"      });",
		"",
		"      server.on('error', (err) => {",
		"        if (err.code === 'EADDRINUSE') {",
		"          attempts++;",
		"          console.log('Port ' + currentPort + ' in use, trying port ' + (currentPort + 1) + '...');",
		"          tryPort(currentPort + 1);",
		"        } else {",
		"          console.error('Server error:', err);",
		"          reject(err);",
		"        }",
		"      });",
		"    }",
		"",
		"    tryPort(port);",
		"  });",
		"}",
		"",
		"// Start the server and handle port conflicts gracefully",
		"findAvailablePort(BASE_PORT)",
		"  .then(({ server, port }) => {",
		"    console.log('Server successfully started on port', port);",
		"    // If we're not using the default port, log it prominently",
		"    if (port !== BASE_PORT) {",
		"      console.log('WARNING: Using port ' + port + ' instead of ' + BASE_PORT + ' due to port conflict');",
		"    }",
		"  })",
		"  .catch((err) => {",
		"    console.error('Failed to start server:', err);",
		"    process.exit(1);",
		"  });"
	].join('\n');
}

// --- IndexedDB Persistence ---
// Saves/restores the entire WebContainer filesystem so work survives browser reloads.

const IDB_NAME = 'p10';
const IDB_STORE = 'snapshots';
const IDB_KEY = 'p10-snapshot';
const SAVE_INTERVAL = 30_000; // Auto-save every 30s

interface FsSnapshot {
	files: Record<string, string>;  // path → content (text files only)
	savedAt: string;
	fileCount: number;
}

let saveTimer: ReturnType<typeof setInterval> | null = null;

function openIdb(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const req = indexedDB.open(IDB_NAME, 1);
		req.onupgradeneeded = () => {
			const db = req.result;
			if (!db.objectStoreNames.contains(IDB_STORE)) {
				db.createObjectStore(IDB_STORE);
			}
		};
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
	});
}

async function saveSnapshotToIdb(snapshot: FsSnapshot): Promise<void> {
	const db = await openIdb();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(IDB_STORE, 'readwrite');
		tx.objectStore(IDB_STORE).put(snapshot, IDB_KEY);
		tx.oncomplete = () => { db.close(); resolve(); };
		tx.onerror = () => { db.close(); reject(tx.error); };
	});
}

async function loadSnapshotFromIdb(): Promise<FsSnapshot | null> {
	const db = await openIdb();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(IDB_STORE, 'readonly');
		const req = tx.objectStore(IDB_STORE).get(IDB_KEY);
		req.onsuccess = () => { db.close(); resolve(req.result ?? null); };
		req.onerror = () => { db.close(); reject(req.error); };
	});
}

/** Read all text files from WebContainer (excluding node_modules, .git) */
async function readAllFiles(container: WebContainer, dir = '.', prefix = ''): Promise<Record<string, string>> {
	const files: Record<string, string> = {};
	const entries = await container.fs.readdir(dir, { withFileTypes: true });

	for (const entry of entries) {
		if (entry.name === 'node_modules' || entry.name === '.git') continue;
		const path = prefix ? `${prefix}/${entry.name}` : entry.name;

		if (entry.isDirectory()) {
			const sub = await readAllFiles(container, `${dir}/${entry.name}`, path);
			Object.assign(files, sub);
		} else {
			try {
				files[path] = await container.fs.readFile(`${dir}/${entry.name}`, 'utf-8');
			} catch {
				// skip binary files
			}
		}
	}
	return files;
}

/** Mount files from a snapshot into the WebContainer */
async function mountSnapshot(container: WebContainer, snapshot: FsSnapshot): Promise<void> {
	// Convert flat file map to WebContainer mount tree
	const tree: Record<string, any> = {};

	for (const [path, content] of Object.entries(snapshot.files)) {
		const parts = path.split('/');
		let node = tree;

		for (let i = 0; i < parts.length - 1; i++) {
			if (!node[parts[i]]) node[parts[i]] = { directory: {} };
			node = node[parts[i]].directory;
		}

		node[parts[parts.length - 1]] = { file: { contents: content } };
	}

	await container.mount(tree);
}

/** Save current WebContainer state to IndexedDB */
export async function saveSnapshot(): Promise<void> {
	if (!instance) return;
	try {
		const files = await readAllFiles(instance);
		const snapshot: FsSnapshot = {
			files,
			savedAt: new Date().toISOString(),
			fileCount: Object.keys(files).length,
		};
		await saveSnapshotToIdb(snapshot);
		console.log(`[container] Snapshot saved: ${snapshot.fileCount} files`);
		debugBus.log('event', 'container', `Snapshot saved (${snapshot.fileCount} files)`);
	} catch (err) {
		console.warn('[container] Snapshot save failed:', err);
	}
}

function startAutoSave() {
	stopAutoSave();
	saveTimer = setInterval(saveSnapshot, SAVE_INTERVAL);
	// Also save on page unload
	window.addEventListener('beforeunload', saveSnapshot);
}

function stopAutoSave() {
	if (saveTimer) {
		clearInterval(saveTimer);
		saveTimer = null;
	}
}

let instance: WebContainer | null = null;
let booting = false;
let backendProcess: any = null;

export type ContainerStatus = 'idle' | 'booting' | 'ready' | 'error';
export type ServerStatus = 'stopped' | 'starting' | 'running' | 'error';

export interface ServerInfo {
	port: number;
	url: string;
	type: 'frontend' | 'backend' | 'unknown';
}

export interface ContainerState {
	status: ContainerStatus;
	serverStatus: ServerStatus;
	serverUrl: string | null;
	servers: ServerInfo[];
	error: string | null;
}

type Listener = (state: ContainerState) => void;
const listeners = new Set<Listener>();

let state: ContainerState = {
	status: 'idle',
	serverStatus: 'stopped',
	serverUrl: null,
	servers: [],
	error: null
};

function setState(partial: Partial<ContainerState>) {
	const prev = state;
	state = { ...state, ...partial };
	listeners.forEach((fn) => fn(state));

	// Debug logging for state changes
	if (partial.status && partial.status !== prev.status) {
		debugBus.log('event', 'container', `status: ${partial.status}`, partial.error || undefined);
	}
	if (partial.serverStatus && partial.serverStatus !== prev.serverStatus) {
		debugBus.log('event', 'container', `serverStatus: ${partial.serverStatus}`);
	}
	if (partial.servers) {
		debugBus.log('event', 'container', `servers updated: ${partial.servers.map(s => s.type + ':' + s.port).join(', ')}`);
	}
}

export function subscribe(fn: Listener): () => void {
	listeners.add(fn);
	fn(state);
	return () => listeners.delete(fn);
}

export function getState(): ContainerState {
	return state;
}

// Register debug provider
debugBus.registerProvider('container', () => ({
	status: state.status,
	serverStatus: state.serverStatus,
	servers: state.servers,
	error: state.error
}));

export function getInstance(): WebContainer | null {
	return instance;
}

/** Reset the container instance (useful for recovery from errors) */
export async function resetContainer(): Promise<void> {
	if (instance) {
		try {
			await instance.teardown();
		} catch (err) {
			console.warn('[container] Error during teardown:', err);
		}
		instance = null;
	}
	booting = false;
	setState({ 
		status: 'idle', 
		serverStatus: 'stopped', 
		serverUrl: null, 
		servers: [], 
		error: null 
	});
	console.log('[container] Container reset completed');
}

/** Boot the WebContainer and scaffold the project */
export async function boot(): Promise<WebContainer> {
	if (instance) {
		// Check if existing instance is healthy
		try {
			// Test if instance is still functional
			await instance.fs.readdir('/');
			return instance;
		} catch {
			// Instance is broken, reset it
			console.log('[container] Existing instance broken, resetting...');
			await resetContainer();
		}
	}
	if (booting) {
		return new Promise((resolve, reject) => {
			const unsub = subscribe((s) => {
				if (s.status === 'ready' && instance) { unsub(); resolve(instance); }
				if (s.status === 'error') { unsub(); reject(new Error(s.error ?? 'Boot failed')); }
			});
		});
	}

	booting = true;
	setState({ status: 'booting', error: null });

	try {
		try {
			instance = await WebContainer.boot();
		} catch (bootErr: any) {
			// Handle 'single instance' error by attempting reset
			if (bootErr?.message?.includes('single WebContainer instance')) {
				console.log('[container] Single instance error, attempting recovery...');
				await resetContainer();
				// Retry after reset
				instance = await WebContainer.boot();
			} else {
				throw bootErr;
			}
		}
		
		// Try to restore from IndexedDB snapshot, fall back to starter files
		let restored = false;
		try {
			const snapshot = await loadSnapshotFromIdb();
			if (snapshot && snapshot.fileCount > 0) {
				console.log(`[container] Restoring snapshot: ${snapshot.fileCount} files from ${snapshot.savedAt}`);
				debugBus.log('event', 'container', `Restoring ${snapshot.fileCount} files from snapshot`);
				await mountSnapshot(instance, snapshot);
				restored = true;
			}
		} catch (err) {
			console.warn('[container] Snapshot restore failed, using starter files:', err);
		}

		if (!restored) {
			await instance.mount(starterFiles);
		}

		setState({ status: 'booting' });
		const installProcess = await instance.spawn('npm', ['install']);
		const installExitCode = await installProcess.exit;
		if (installExitCode !== 0) {
			throw new Error(`npm install failed with exit code ${installExitCode}`);
		}

		setState({ status: 'ready' });

		// Start auto-saving to IndexedDB
		startAutoSave();

		// Take initial snapshot if this is a fresh start
		if (!restored) {
			await saveSnapshot();
		}

		// Listen for ANY server-ready event (frontend or backend)
		instance.on('server-ready', (port, url) => {
			console.log(`[container] Server ready on port ${port}: ${url}`);
			debugBus.log('event', 'container', `server-ready port=${port}`, url);

			// More flexible server type detection
			let type: 'frontend' | 'backend' | 'unknown';
			if (port === 5173) {
				type = 'frontend';
			} else if (port >= 3001 && port <= 3020) {
				// Backend typically runs on ports 3001-3020
				type = 'backend';
			} else {
				type = 'unknown';
			}
			const newServer: ServerInfo = { port, url, type };

			const servers = [...state.servers.filter((s) => s.port !== port), newServer];
			const frontendUrl = servers.find((s) => s.type === 'frontend')?.url ?? url;

			setState({
				serverStatus: 'running',
				serverUrl: frontendUrl,
				servers
			});
		});

		return instance;
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		setState({ status: 'error', error: msg });
		booting = false;
		throw err;
	}
}

/** Capture error output from container processes */
function captureErrors(chunk: string, source: string) {
	// Strip ANSI escape codes
	const clean = chunk.replace(/\x1b\[[0-9;]*m/g, '').trim();
	if (!clean) return;

	// Detect error patterns
	const isError =
		clean.includes('Error:') ||
		clean.includes('error:') ||
		clean.includes('SyntaxError') ||
		clean.includes('ReferenceError') ||
		clean.includes('TypeError') ||
		clean.includes('Failed') ||
		clean.includes('Unterminated') ||
		clean.includes('Unexpected token') ||
		(clean.includes('[plugin:') && clean.includes(']'));

	if (isError) {
		errorStore.add(`[${source}] ${clean}`);
		console.warn(`[container:${source}:error]`, clean);
	}
}

/** Start the dev servers inside the container */
export async function startDevServer(): Promise<void> {
	if (!instance) throw new Error('Container not booted');

	setState({ serverStatus: 'starting' });

	// Start backend and frontend as separate processes
	backendProcess = await instance.spawn('npm', ['run', 'dev:backend']);
	backendProcess.output.pipeTo(
		new WritableStream({
			write(chunk) {
				console.log('[container:backend]', chunk);
				captureErrors(chunk, 'backend');
			}
		})
	);

	const frontendProc = await instance.spawn('npm', ['run', 'dev:frontend']);
	frontendProc.output.pipeTo(
		new WritableStream({
			write(chunk) {
				console.log('[container:frontend]', chunk);
				captureErrors(chunk, 'frontend');
			}
		})
	);

	frontendProc.exit.then((code) => {
		if (code !== 0) {
			setState({ serverStatus: 'error', error: `Frontend server exited with code ${code}` });
		}
	});
}

/**
 * Signal that backend server files changed.
 * With --watch mode, Node.js auto-restarts. We just wait for it to settle.
 */
export async function restartBackend(): Promise<void> {
	console.log('[container] Backend files changed, --watch will auto-restart...');
	// node --watch detects the file change and restarts automatically
	// Just wait for the restart to complete
	await new Promise((r) => setTimeout(r, 3000));
	console.log('[container] Backend should be restarted');
}

/** Write a file inside the container */
export async function writeFile(path: string, content: string): Promise<void> {
	if (!instance) throw new Error('Container not booted');
	await instance.fs.writeFile(path, content);
}

/** Read a file from the container */
export async function readFile(path: string): Promise<string> {
	if (!instance) throw new Error('Container not booted');
	return await instance.fs.readFile(path, 'utf-8');
}

/** List directory contents */
export async function readDir(path: string): Promise<string[]> {
	if (!instance) throw new Error('Container not booted');
	const entries = await instance.fs.readdir(path, { withFileTypes: true });
	return entries.map((e) => (e.isDirectory() ? e.name + '/' : e.name));
}

/** Run a command and return output */
export async function runCommand(
	cmd: string,
	args: string[]
): Promise<{ exitCode: number; output: string }> {
	if (!instance) throw new Error('Container not booted');
	const process = await instance.spawn(cmd, args);
	let output = '';
	process.output.pipeTo(
		new WritableStream({
			write(chunk) {
				output += chunk;
			}
		})
	);
	const exitCode = await process.exit;
	return { exitCode, output };
}

// ─── Starter Project Files ───────────────────────────────────────────

const starterFiles: Record<string, any> = {
	'package.json': {
		file: {
			contents: JSON.stringify(
				{
					name: 'p10-preview',
					private: true,
					version: '0.0.1',
					type: 'module',
					scripts: {
						dev: 'node server/index.js & vite --host',
						'dev:frontend': 'vite --host',
						'dev:backend': 'node --watch server/index.js'
					},
					dependencies: {
						react: '^19.0.0',
						'react-dom': '^19.0.0',
						express: '^4.21.0',
						cors: '^2.8.5'
					},
					devDependencies: {
						'@vitejs/plugin-react': '^4.5.2',
						vite: '^6.3.5'
					}
				},
				null,
				2
			)
		}
	},
	'vite.config.js': {
		file: {
			contents: `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        configure: (proxy, options) => {
          // Dynamic backend port detection
          proxy.on('error', (err, req, res) => {
            console.log('Proxy error, backend might be on different port:', err.message);
          });
        }
      }
    }
  }
});
`
		}
	},
	'index.html': {
		file: {
			contents: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>P10 Preview</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: system-ui, sans-serif; background: #f5f5f5; color: #333; }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
    <script src="/p10-bridge.js"></script>
  </body>
</html>`
		}
	},
	src: {
		directory: {
			'main.jsx': {
				file: {
					contents: `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
`
				}
			},
			'App.jsx': {
				file: {
					contents: `import React from 'react';

export default function App() {
  return (
    <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>🚀 P10 Preview</h1>
      <p style={{ color: '#666' }}>
        Your app will appear here. Start building by chatting with the agent.
      </p>
    </div>
  );
}
`
				}
			}
		}
	},
	public: {
		directory: {
			'p10-bridge.js': {
				file: {
					contents: `// P10 API proxy bridge
window.addEventListener('message', async (event) => {
  if (event.data?.type !== 'p10-api-request') return;
  const { id, url, method, headers, body } = event.data;
  try {
    const opts = { method, headers: headers || {} };
    if (body) opts.body = body;
    const res = await fetch(url, opts);
    const text = await res.text();
    window.parent.postMessage({
      type: 'p10-api-response', id,
      status: res.status, statusText: res.statusText, body: text
    }, '*');
  } catch (err) {
    window.parent.postMessage({
      type: 'p10-api-response', id,
      status: 0, statusText: 'Error', body: err.message
    }, '*');
  }
});
console.log('[p10-bridge] API bridge loaded');
`
				}
			}
		}
	},
	server: {
		directory: {
			'index.js': {
				file: {
					contents: generateServerContent()
				}
			}
		}
	}
};
