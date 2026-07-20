import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { OnEvent } from '@nestjs/event-emitter';
import { Repository } from 'typeorm';
import { promises as fs } from 'fs';
import { join } from 'path';
import { TracerTree } from '../entities/tracer-tree.entity';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Injectable()
export class TracerService {
  constructor(
    @InjectRepository(TracerTree)
    private readonly tracerRepo: Repository<TracerTree>,
    private readonly realtime: RealtimeGateway,
  ) {}

  async loadTree() {
    const existing = await this.tracerRepo.findOne({ where: { id: 'default' } });
    return existing?.treeData ?? null;
  }

  async saveTree(treeData: any) {
    try {
      const existing = await this.tracerRepo.findOne({ where: { id: 'default' } });
      const entity = existing ?? this.tracerRepo.create({ id: 'default', treeData });
      entity.treeData = treeData;
      await this.tracerRepo.save(entity);
    } catch (error) {
      console.warn('Database save failed, falling back to file backup', error);
    }

    try {
      const backupPath = join(process.cwd(), 'tracer_backup.json');
      await fs.writeFile(backupPath, JSON.stringify(treeData, null, 2));
    } catch (fileError) {
      console.warn('Unable to write tracer backup file', fileError);
    }

    return treeData;
  }

  /**
   * Listen for record updates and broadcast tracer update event
   * This enables auto-sync of tracer nodes when records change
   */
  @OnEvent('records_updated')
  async handleRecordsUpdated(payload: any) {
    try {
      // Load current tracer tree
      const tree = await this.loadTree();
      if (!tree) return;

      // Broadcast update to all connected clients
      this.realtime.broadcast('tracer_updated', {
        action: payload.action,
        recordIds: payload.ids || [payload.id],
        timestamp: new Date().toISOString(),
      });

      console.log(`[Tracer] Syncing records update: ${payload.action}`);
    } catch (error) {
      console.warn('[Tracer] Failed to sync records update:', error);
    }
  }
}
