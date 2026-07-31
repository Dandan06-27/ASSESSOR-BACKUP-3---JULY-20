import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MotherLot } from '../entities/mother-lot.entity';
import { User } from '../entities/user.entity';
import { AuditService } from '../audit/audit.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { CreateMotherLotDto, UpdateMotherLotDto } from './dto/mother-lot.dto';

@Injectable()
export class MotherLotsService {
  constructor(
    @InjectRepository(MotherLot)
    private readonly motherLotRepo: Repository<MotherLot>,
    private readonly audit: AuditService,
    private readonly realtime: RealtimeGateway,
  ) {}

  async create(dto: CreateMotherLotDto, user: User) {
    const motherLot = this.motherLotRepo.create({
      ...dto,
      createdById: user.id,
    });
    const saved = await this.motherLotRepo.save(motherLot);
    await this.audit.log({
      userId: user.id,
      action: 'CREATE_MOTHER_LOT',
      entity: 'tracer_motherlots',
      entityId: saved.id,
    });
    this.realtime.broadcast('motherlots_updated', { action: 'create', id: saved.id });
    return saved;
  }

  async findAll() {
    return await this.motherLotRepo.find({
      relations: { createdBy: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string) {
    const motherLot = await this.motherLotRepo.findOne({
      where: { id },
      relations: { createdBy: true },
    });
    if (!motherLot) {
      throw new NotFoundException('Mother lot not found');
    }
    return motherLot;
  }

  async update(id: string, dto: UpdateMotherLotDto, user: User) {
    const motherLot = await this.motherLotRepo.findOne({ where: { id } });
    if (!motherLot) {
      throw new NotFoundException('Mother lot not found');
    }
    Object.assign(motherLot, dto);
    const saved = await this.motherLotRepo.save(motherLot);
    await this.audit.log({
      userId: user.id,
      action: 'UPDATE_MOTHER_LOT',
      entity: 'tracer_motherlots',
      entityId: id,
    });
    this.realtime.broadcast('motherlots_updated', { action: 'update', id });
    return saved;
  }

  async remove(id: string, user: User) {
    const motherLot = await this.motherLotRepo.findOne({ where: { id } });
    if (!motherLot) {
      throw new NotFoundException('Mother lot not found');
    }
    await this.motherLotRepo.remove(motherLot);
    await this.audit.log({
      userId: user.id,
      action: 'DELETE_MOTHER_LOT',
      entity: 'tracer_motherlots',
      entityId: id,
    });
    this.realtime.broadcast('motherlots_updated', { action: 'delete', id });
    return motherLot;
  }
}
