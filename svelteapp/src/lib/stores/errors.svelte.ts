/** Tracks build/runtime errors from the WebContainer for agent feedback */

class ErrorStore {
	errors = $state<string[]>([]);

	add(error: string) {
		// Dedupe and keep last 10
		if (!this.errors.includes(error)) {
			this.errors = [...this.errors, error].slice(-10);
		}
	}

	clear() {
		this.errors = [];
	}

	/** Get errors as context string for the AI agent */
	getContext(): string {
		if (this.errors.length === 0) return '';
		return '\n\n⚠️ BUILD/RUNTIME ERRORS:\n' + this.errors.join('\n');
	}
}

export const errorStore = new ErrorStore();
