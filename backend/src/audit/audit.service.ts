import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../entities/audit-log.entity';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
  ) {}

  async log(params: {
    userId?: string;
    action: string;
    entity: string;
    entityId?: string;
    details?: Record<string, unknown>;
    ipAddress?: string;
  }) {
    try {
      const entry = this.auditRepo.create(params);
      return await this.auditRepo.save(entry);
    } catch (error) {
      console.warn('Audit logging failed:', error instanceof Error ? error.message : error);
      return null;
    }
  }

  async findAll(limit = 100) {
    return this.auditRepo.find({
      relations: { user: true },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}
