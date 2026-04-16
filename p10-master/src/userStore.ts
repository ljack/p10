/**
 * User Store — simple local user management
 * Persists to ~/.p10/users.json
 * No passwords for now — just username-based identity
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { makeId } from './types.js';

export interface User {
  id: string;
  username: string;
  createdAt: string;
}

const P10_HOME = process.env.P10_HOME || join(process.env.HOME || '/tmp', '.p10');
const USERS_FILE = join(P10_HOME, 'users.json');

class UserStore {
  private users = new Map<string, User>();

  constructor() {
    this.load();
  }

  /** Create a new user (or return existing) */
  create(username: string): User {
    const normalized = username.trim().toLowerCase();
    if (!normalized) throw new Error('Username required');

    // Return existing user if username taken
    const existing = this.getByUsername(normalized);
    if (existing) return existing;

    const user: User = {
      id: makeId(),
      username: normalized,
      createdAt: new Date().toISOString(),
    };

    this.users.set(user.id, user);
    this.persist();
    console.log(`[users] Created user: ${user.username} (${user.id})`);
    return user;
  }

  /** Get user by ID */
  get(id: string): User | null {
    return this.users.get(id) || null;
  }

  /** Get user by username */
  getByUsername(username: string): User | null {
    const normalized = username.trim().toLowerCase();
    for (const user of this.users.values()) {
      if (user.username === normalized) return user;
    }
    return null;
  }

  /** Login — creates user if doesn't exist */
  login(username: string): User {
    return this.create(username);
  }

  /** List all users */
  list(): User[] {
    return Array.from(this.users.values());
  }

  /** Delete user by ID */
  delete(id: string): boolean {
    const deleted = this.users.delete(id);
    if (deleted) this.persist();
    return deleted;
  }

  private load() {
    try {
      if (!existsSync(USERS_FILE)) return;
      const data = JSON.parse(readFileSync(USERS_FILE, 'utf-8'));
      for (const user of data.users || []) {
        this.users.set(user.id, user);
      }
      console.log(`[users] Loaded ${this.users.size} users`);
    } catch (err) {
      console.error('[users] Failed to load:', err);
    }
  }

  private persist() {
    try {
      if (!existsSync(P10_HOME)) mkdirSync(P10_HOME, { recursive: true });
      writeFileSync(USERS_FILE, JSON.stringify({
        users: Array.from(this.users.values()),
        updatedAt: new Date().toISOString(),
      }, null, 2));
    } catch (err) {
      console.error('[users] Failed to persist:', err);
    }
  }
}

export const userStore = new UserStore();
export { P10_HOME };
