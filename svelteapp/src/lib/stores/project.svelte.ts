/**
 * Active Project Store — tracks the currently open project
 * Used by workspace components to scope API calls to the right project.
 */

export interface ActiveProject {
	id: string;
	name: string;
	description?: string;
}

class ProjectStore {
	current = $state<ActiveProject | null>(null);

	/** Set the active project (when workspace loads) */
	setProject(project: ActiveProject) {
		this.current = project;
	}

	/** Clear active project (when leaving workspace) */
	clear() {
		this.current = null;
	}

	/** Get the master API base URL for the current project */
	get apiBase(): string {
		if (!this.current) return 'http://localhost:7777';
		return `http://localhost:7777/projects/${this.current.id}`;
	}

	/** Whether a project is active */
	get isActive(): boolean {
		return this.current !== null;
	}
}

export const activeProject = new ProjectStore();
