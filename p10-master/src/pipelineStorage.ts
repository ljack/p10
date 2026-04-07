/**
 * Pipeline Storage — Simple in-memory storage for task pipelines
 */

import type { TaskPipeline } from './decomposer.js';

class PipelineStorage {
  private pipelines = new Map<string, TaskPipeline>();

  store(pipeline: TaskPipeline): void {
    this.pipelines.set(pipeline.id, pipeline);
  }

  get(id: string): TaskPipeline | undefined {
    return this.pipelines.get(id);
  }

  update(id: string, updates: Partial<TaskPipeline>): boolean {
    const pipeline = this.pipelines.get(id);
    if (!pipeline) return false;
    
    Object.assign(pipeline, updates);
    return true;
  }

  list(): TaskPipeline[] {
    return Array.from(this.pipelines.values());
  }

  getActive(): TaskPipeline[] {
    return this.list().filter(p => p.status === 'executing');
  }

  getRecent(limit = 10): TaskPipeline[] {
    return this.list()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  delete(id: string): boolean {
    return this.pipelines.delete(id);
  }

  clearAll(): number {
    const count = this.pipelines.size;
    this.pipelines.clear();
    return count;
  }

  cleanup(olderThanHours = 24): number {
    const cutoff = Date.now() - (olderThanHours * 60 * 60 * 1000);
    let deleted = 0;
    
    for (const [id, pipeline] of this.pipelines.entries()) {
      if (new Date(pipeline.createdAt).getTime() < cutoff && 
          (pipeline.status === 'completed' || pipeline.status === 'failed')) {
        this.pipelines.delete(id);
        deleted++;
      }
    }
    
    return deleted;
  }
}

export const pipelineStorage = new PipelineStorage();