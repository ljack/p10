/**
 * Auth Store — simple username-based auth
 * Persists to localStorage, syncs with master daemon
 */

export interface User {
	id: string;
	username: string;
	createdAt: string;
}

const STORAGE_KEY = 'p10_user';

class AuthStore {
	user = $state<User | null>(null);

	constructor() {
		if (typeof window !== 'undefined') {
			const stored = localStorage.getItem(STORAGE_KEY);
			if (stored) {
				try {
					this.user = JSON.parse(stored);
				} catch { /* ignore */ }
			}
		}
	}

	get isLoggedIn(): boolean {
		return this.user !== null;
	}

	async login(username: string): Promise<User> {
		const resp = await fetch('http://localhost:7777/auth/login', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ username }),
		});

		if (!resp.ok) {
			const err = await resp.json().catch(() => ({ error: 'Login failed' }));
			throw new Error(err.error || 'Login failed');
		}

		const data = await resp.json();
		this.user = data.user;

		if (typeof window !== 'undefined') {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(this.user));
		}

		return data.user;
	}

	logout(): void {
		this.user = null;
		if (typeof window !== 'undefined') {
			localStorage.removeItem(STORAGE_KEY);
		}
	}
}

export const auth = new AuthStore();
