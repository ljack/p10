/** Reactive settings store using $state — shared across components */

class SettingsStore {
	apiKey = $state('');
	model = $state('claude-sonnet-4-20250514');

	constructor() {
		if (typeof window !== 'undefined') {
			this.apiKey = localStorage.getItem('p10_api_key') || '';
			this.model = localStorage.getItem('p10_model') || 'claude-sonnet-4-20250514';
		}
	}

	setApiKey(key: string) {
		this.apiKey = key;
		if (typeof window !== 'undefined') {
			localStorage.setItem('p10_api_key', key);
		}
	}

	setModel(model: string) {
		this.model = model;
		if (typeof window !== 'undefined') {
			localStorage.setItem('p10_model', model);
		}
	}
}

export const settings = new SettingsStore();
