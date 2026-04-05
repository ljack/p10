import { WebContainer } from '@webcontainer/api';

let instance: WebContainer | null = null;
let booting = false;

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
	state = { ...state, ...partial };
	listeners.forEach((fn) => fn(state));
}

export function subscribe(fn: Listener): () => void {
	listeners.add(fn);
	fn(state);
	return () => listeners.delete(fn);
}

export function getState(): ContainerState {
	return state;
}

export function getInstance(): WebContainer | null {
	return instance;
}

/** Boot the WebContainer and scaffold the project */
export async function boot(): Promise<WebContainer> {
	if (instance) return instance;
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
		instance = await WebContainer.boot();
		await instance.mount(starterFiles);

		setState({ status: 'booting' });
		const installProcess = await instance.spawn('npm', ['install']);
		const installExitCode = await installProcess.exit;
		if (installExitCode !== 0) {
			throw new Error(`npm install failed with exit code ${installExitCode}`);
		}

		setState({ status: 'ready' });

		// Listen for ANY server-ready event (frontend or backend)
		instance.on('server-ready', (port, url) => {
			console.log(`[container] Server ready on port ${port}: ${url}`);

			const type = port === 5173 ? 'frontend' : port === 3001 ? 'backend' : 'unknown';
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

/** Start the dev servers inside the container */
export async function startDevServer(): Promise<void> {
	if (!instance) throw new Error('Container not booted');

	setState({ serverStatus: 'starting' });

	// Start backend and frontend as separate processes
	const backendProc = await instance.spawn('npm', ['run', 'dev:backend']);
	backendProc.output.pipeTo(
		new WritableStream({
			write(chunk) {
				console.log('[container:backend]', chunk);
			}
		})
	);

	const frontendProc = await instance.spawn('npm', ['run', 'dev:frontend']);
	frontendProc.output.pipeTo(
		new WritableStream({
			write(chunk) {
				console.log('[container:frontend]', chunk);
			}
		})
	);

	frontendProc.exit.then((code) => {
		if (code !== 0) {
			setState({ serverStatus: 'error', error: `Frontend server exited with code ${code}` });
		}
	});
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
						'dev:backend': 'node server/index.js'
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
      '/api': 'http://localhost:3001'
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
					contents: `import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Example endpoint — agent will add more
app.get('/api', (req, res) => {
  res.json({ message: 'P10 API is running. Add endpoints by chatting with the agent.' });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(\`API server running on http://localhost:\${PORT}\`);
});
`
				}
			}
		}
	}
};
