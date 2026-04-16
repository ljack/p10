/**
 * Project Store — manages project lifecycle and storage
 * Each project gets its own directory: ~/.p10/projects/{uuid}/
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { makeId } from './types.js';
import { P10_HOME } from './userStore.js';

export interface Project {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
}

const PROJECTS_DIR = join(P10_HOME, 'projects');

class ProjectStore {
  private projects = new Map<string, Project>();

  constructor() {
    this.loadAll();
  }

  /** Create a new project */
  create(name: string, ownerId: string, description?: string): Project {
    if (!name.trim()) throw new Error('Project name required');
    if (!ownerId) throw new Error('Owner ID required');

    const project: Project = {
      id: makeId(),
      name: name.trim(),
      description,
      ownerId,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Create project directory structure
    const projectDir = this.projectDir(project.id);
    mkdirSync(projectDir, { recursive: true });
    mkdirSync(join(projectDir, 'specs'), { recursive: true });
    mkdirSync(join(projectDir, 'container-snapshot'), { recursive: true });

    this.projects.set(project.id, project);
    this.persistProject(project);
    console.log(`[projects] Created: ${project.name} (${project.id}) for user ${ownerId}`);
    return project;
  }

  /** Get project by ID */
  get(id: string): Project | null {
    return this.projects.get(id) || null;
  }

  /** List projects for a user */
  listByOwner(ownerId: string): Project[] {
    return Array.from(this.projects.values())
      .filter(p => p.ownerId === ownerId && p.status === 'active')
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  /** List all projects */
  listAll(): Project[] {
    return Array.from(this.projects.values())
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  /** Update project metadata */
  update(id: string, updates: Partial<Pick<Project, 'name' | 'description' | 'status'>>): Project | null {
    const project = this.projects.get(id);
    if (!project) return null;

    Object.assign(project, updates, { updatedAt: new Date().toISOString() });
    this.persistProject(project);
    return project;
  }

  /** Archive a project (soft delete) */
  archive(id: string): boolean {
    const project = this.projects.get(id);
    if (!project) return false;

    project.status = 'archived';
    project.updatedAt = new Date().toISOString();
    this.persistProject(project);
    console.log(`[projects] Archived: ${project.name} (${project.id})`);
    return true;
  }

  /** Touch project (update timestamp) */
  touch(id: string): void {
    const project = this.projects.get(id);
    if (project) {
      project.updatedAt = new Date().toISOString();
      this.persistProject(project);
    }
  }

  /** Get the filesystem path for a project */
  projectDir(id: string): string {
    return join(PROJECTS_DIR, id);
  }

  /** Get path to a project's data file */
  projectFile(id: string, filename: string): string {
    return join(this.projectDir(id), filename);
  }

  /** Check if user owns project */
  isOwner(projectId: string, userId: string): boolean {
    const project = this.projects.get(projectId);
    return project?.ownerId === userId;
  }

  /** Load all projects from disk */
  private loadAll() {
    try {
      if (!existsSync(PROJECTS_DIR)) {
        mkdirSync(PROJECTS_DIR, { recursive: true });
        return;
      }

      const dirs = readdirSync(PROJECTS_DIR, { withFileTypes: true })
        .filter(d => d.isDirectory());

      for (const dir of dirs) {
        const metaFile = join(PROJECTS_DIR, dir.name, 'project.json');
        if (!existsSync(metaFile)) continue;

        try {
          const project: Project = JSON.parse(readFileSync(metaFile, 'utf-8'));
          this.projects.set(project.id, project);
        } catch (err) {
          console.error(`[projects] Failed to load ${dir.name}:`, err);
        }
      }

      console.log(`[projects] Loaded ${this.projects.size} projects`);
    } catch (err) {
      console.error('[projects] Failed to load projects:', err);
    }
  }

  /** Persist a single project's metadata */
  private persistProject(project: Project) {
    try {
      const dir = this.projectDir(project.id);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      writeFileSync(
        join(dir, 'project.json'),
        JSON.stringify(project, null, 2)
      );
    } catch (err) {
      console.error(`[projects] Failed to persist ${project.id}:`, err);
    }
  }
}

export const projectStore = new ProjectStore();
export { PROJECTS_DIR };
