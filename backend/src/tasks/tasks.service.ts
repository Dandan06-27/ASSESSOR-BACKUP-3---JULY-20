import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskStatus } from '../common/enums';
import { AuditService } from '../audit/audit.service';
import { Task } from '../entities/task.entity';
import { User } from '../entities/user.entity';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task) private readonly taskRepo: Repository<Task>,
    private readonly audit: AuditService,
    private readonly realtime: RealtimeGateway,
  ) {}

  create(data: Partial<Task>, user: User) {
    const task = this.taskRepo.create({
      ...data,
      createdById: user.id,
    });
    return this.taskRepo.save(task).then(async (saved) => {
      await this.audit.log({
        userId: user.id,
        action: 'CREATE_TASK',
        entity: 'task',
        entityId: saved.id,
      });
      this.realtime.broadcast('tasks_updated', saved);
      return saved;
    });
  }

  findAll() {
    return this.taskRepo.find({
      relations: { assignee: true, division: true, createdBy: true },
      order: { createdAt: 'DESC' },
    });
  }

  findByUser(userId: string) {
    return this.taskRepo.find({
      where: { assigneeId: userId },
      relations: { division: true, createdBy: true },
      order: { createdAt: 'DESC' },
    });
  }

  async updateStatus(id: string, status: TaskStatus, user: User) {
    const task = await this.taskRepo.findOne({ where: { id } });
    if (!task) throw new NotFoundException('Task not found');
    task.status = status;
    const saved = await this.taskRepo.save(task);
    await this.audit.log({
      userId: user.id,
      action: 'UPDATE_TASK',
      entity: 'task',
      entityId: id,
      details: { status },
    });
    this.realtime.broadcast('tasks_updated', saved);
    return saved;
  }
}
