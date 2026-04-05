import { WebContainer } from '@webcontainer/api';

let instance: WebContainer | null = null;
let booting = false;

export type ContainerStatus = 'idle' | 'booting' | 'ready' | 'error';
export type ServerStatus = 'stopped' | 'starting' | 'running' | 'error';

export interface ContainerState {
	status: ContainerStatus;
	serverStatus: ServerStatus;
	serverUrl: string | null;
	error: string | null;
}

type Listener = (state: ContainerState) => void;
const listeners = new Set<Listener>();

let state: ContainerState = {
	status: 'idle',
	serverStatus: 'stopped',
	serverUrl: null,
	error: null
};

function setState(partial: Partial<ContainerState>) {
	state = { ...state, ...partial };
	listeners.forEach((fn) => fn(state));
}

export function subscribe(fn: Listener): () => void {
	listeners.add(fn);
	fn(state); // send current state immediately
	return () => listeners.delete(fn);
}

export function getState(): ContainerState {
	return state;
}

export function getInstance(): WebContainer | null {
	return instance;
}

/** Boot the WebContainer and scaffold a Vite + React project */
export async function boot(): Promise<WebContainer> {
	if (instance) return instance;
	if (booting) {
		// Wait for existing boot
		return new Promise((resolve, reject) => {
			const unsub = subscribe((s) => {
				if (s.status === 'ready' && instance) {
					unsub();
					resolve(instance);
				}
				if (s.status === 'error') {
					unsub();
					reject(new Error(s.error ?? 'Boot failed'));
				}
			});
		});
	}

	booting = true;
	setState({ status: 'booting', error: null });

	try {
		instance = await WebContainer.boot();

		// Write the starter project files
		await instance.mount(starterFiles);

		// Install dependencies
		setState({ status: 'booting' });
		const installProcess = await instance.spawn('npm', ['install']);

		const installExitCode = await installProcess.exit;
		if (installExitCode !== 0) {
			throw new Error(`npm install failed with exit code ${installExitCode}`);
		}

		setState({ status: 'ready' });

		// Listen for server-ready event
		instance.on('server-ready', (_port, url) => {
			setState({ serverStatus: 'running', serverUrl: url });
		});

		return instance;
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		setState({ status: 'error', error: msg });
		booting = false;
		throw err;
	}
}

/** Start the Vite dev server inside the container */
export async function startDevServer(): Promise<void> {
	if (!instance) throw new Error('Container not booted');

	setState({ serverStatus: 'starting' });

	const process = await instance.spawn('npm', ['run', 'dev']);

	// Stream output for debugging
	process.output.pipeTo(
		new WritableStream({
			write(chunk) {
				console.log('[container]', chunk);
			}
		})
	);

	process.exit.then((code) => {
		if (code !== 0) {
			setState({ serverStatus: 'error', error: `Dev server exited with code ${code}` });
		} else {
			setState({ serverStatus: 'stopped', serverUrl: null });
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
						dev: 'vite --host'
					},
					dependencies: {
						react: '^19.0.0',
						'react-dom': '^19.0.0'
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
			contents: `
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
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
  </body>
</html>`
		}
	},
	src: {
		directory: {
			'main.jsx': {
				file: {
					contents: `
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
`
				}
			},
			'App.jsx': {
				file: {
					contents: `
import React from 'react';

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
	}
};
