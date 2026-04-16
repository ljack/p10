/**
 * Spec Loader — syncs spec files between container file system and spec manager
 */

import { getInstance } from '$lib/sandbox/container';
import { specManager } from './specManager.svelte';

const SPEC_FILES = ['IDEA.md', 'PRD.md', 'FSD.md', 'PLAN.md'];

/**
 * Load all spec files from the container file system
 */
export async function loadSpecsFromContainer(): Promise<void> {
  const container = getInstance();
  if (!container) return;

  for (const filename of SPEC_FILES) {
    try {
      const content = await container.fs.readFile(filename, 'utf-8');
      const status = content.trim() ? 'draft' : 'empty';
      specManager.updateSpec(filename, content, status);
      console.log(`[specs] Loaded ${filename}: ${content.length} chars`);
    } catch (err) {
      // File doesn't exist - that's OK, keep as empty
      console.log(`[specs] ${filename} not found, keeping empty`);
    }
  }
}

/**
 * Save a spec file to the container file system
 */
export async function saveSpecToContainer(filename: string, content: string): Promise<void> {
  const container = getInstance();
  if (!container) throw new Error('Container not ready');

  await container.fs.writeFile(filename, content);
  console.log(`[specs] Saved ${filename} to container: ${content.length} chars`);
}

/**
 * Watch for container readiness and auto-load specs
 */
export function startSpecSync(): void {
  // Load specs when container becomes ready
  let lastContainerState: any = null;
  
  const checkAndLoad = () => {
    const container = getInstance();
    const isReady = container && lastContainerState?.status === 'ready';
    
    if (isReady && lastContainerState !== container) {
      loadSpecsFromContainer();
      lastContainerState = container;
    }
  };

  // Check periodically
  setInterval(checkAndLoad, 2000);
  checkAndLoad();
}