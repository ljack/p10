/**
 * Git manager that runs git commands inside the WebContainer.
 * WebContainer doesn't have native git, so we install and use
 * a lightweight JS git (isomorphic-git CLI) or just track changes
 * via simple file snapshots.
 *
 * For MVP, we use a simple snapshot-based approach:
 * - Save named snapshots of all project files
 * - Rollback by restoring a snapshot
 * - This avoids isomorphic-git's fs compatibility issues with WebContainer
 */

import { getInstance } from '$lib/sandbox/container';

export interface GitCommit {
	oid: string;
	message: string;
	timestamp: Date;
}

interface Snapshot {
	oid: string;
	message: string;
	timestamp: Date;
	files: Map<string, string>;
}

const snapshots: Snapshot[] = [];

/** Generate a short hash */
function makeOid(): string {
	return Math.random().toString(36).substring(2, 9) + Date.now().toString(36).slice(-3);
}

/** Recursively read all project files from the container */
async function readAllFiles(dir = '.', prefix = ''): Promise<Map<string, string>> {
	const container = getInstance();
	if (!container) throw new Error('WebContainer not ready');

	const files = new Map<string, string>();
	const entries = await container.fs.readdir(dir, { withFileTypes: true });

	for (const entry of entries) {
		if (entry.name === 'node_modules' || entry.name === '.git') continue;
		const path = prefix ? `${prefix}/${entry.name}` : entry.name;

		if (entry.isDirectory()) {
			const subFiles = await readAllFiles(`${dir}/${entry.name}`, path);
			subFiles.forEach((content, p) => files.set(p, content));
		} else {
			try {
				const content = await container.fs.readFile(`${dir}/${entry.name}`, 'utf-8');
				files.set(path, content);
			} catch {
				// skip binary files
			}
		}
	}

	return files;
}

/** Initialize — take first snapshot */
export async function initRepo(): Promise<void> {
	if (snapshots.length > 0) return;
	await commitAll('Initial project scaffold');
	console.log('[git] Repo initialized with initial snapshot');
}

/** Take a snapshot of all current files */
export async function commitAll(message: string): Promise<string> {
	const files = await readAllFiles();

	// Check if anything changed from last snapshot
	if (snapshots.length > 0) {
		const lastFiles = snapshots[snapshots.length - 1].files;
		let hasChanges = false;

		if (files.size !== lastFiles.size) {
			hasChanges = true;
		} else {
			for (const [path, content] of files) {
				if (lastFiles.get(path) !== content) {
					hasChanges = true;
					break;
				}
			}
		}

		if (!hasChanges) {
			console.log('[git] No changes to commit');
			return '';
		}
	}

	const oid = makeOid();
	snapshots.unshift({
		oid,
		message,
		timestamp: new Date(),
		files: new Map(files)
	});

	console.log('[git] Committed:', oid.slice(0, 7), message, `(${files.size} files)`);
	return oid;
}

/** Get commit log */
export async function getLog(depth = 20): Promise<GitCommit[]> {
	return snapshots.slice(0, depth).map((s) => ({
		oid: s.oid,
		message: s.message,
		timestamp: s.timestamp
	}));
}

/** Rollback to a specific snapshot */
export async function rollback(oid: string): Promise<void> {
	const container = getInstance();
	if (!container) throw new Error('WebContainer not ready');

	const snapshot = snapshots.find((s) => s.oid === oid);
	if (!snapshot) throw new Error(`Snapshot not found: ${oid}`);

	// Get current files to detect deletions
	const currentFiles = await readAllFiles();

	// Delete files that don't exist in the snapshot
	for (const path of currentFiles.keys()) {
		if (!snapshot.files.has(path)) {
			try {
				await container.fs.rm(path);
				console.log('[git] Deleted:', path);
			} catch {
				// ignore
			}
		}
	}

	// Restore all files from snapshot
	for (const [path, content] of snapshot.files) {
		const dir = path.split('/').slice(0, -1).join('/');
		if (dir) {
			await container.fs.mkdir(dir, { recursive: true });
		}
		await container.fs.writeFile(path, content);
	}

	console.log('[git] Rolled back to:', oid.slice(0, 7), `(${snapshot.files.size} files restored)`);
}

/** Check if repo is initialized */
export async function isRepoInitialized(): Promise<boolean> {
	return snapshots.length > 0;
}
