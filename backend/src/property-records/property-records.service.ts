import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { PropertyRecord } from '../entities/property-record.entity';
import { User } from '../entities/user.entity';
import {
  CreatePropertyRecordDto,
  SearchPropertyRecordDto,
} from './dto/create-property-record.dto';

@Injectable()
export class PropertyRecordsService {
  constructor(
    @InjectRepository(PropertyRecord)
    private readonly propertyRecordRepo: Repository<PropertyRecord>,
    private readonly audit: AuditService,
  ) {}

  async create(dto: CreatePropertyRecordDto, user: User) {
    const tieLine = dto.tieLine || {};
    const record = this.propertyRecordRepo.create({
      barangay: dto.barangay || '',
      lotNo: dto.lotNumber || '',
      arpNo: dto.arpNumber || '',
      titleNo: dto.titleNumber || '',
      refPoint: dto.referencePoint || '',
      distance: tieLine.distance || '',
      degree: tieLine.degrees || '',
      minutes: tieLine.minutes || '',
      tieLine,
      technicalDescription: dto.technicalDescription || [],
      createdById: user?.id,
    });
    const saved = await this.propertyRecordRepo.save(record);
    await this.audit.log({
      userId: user?.id,
      action: 'CREATE_PROPERTY_RECORD',
      entity: 'property_record',
      entityId: saved.id,
    });
    return saved;
  }

  async findAll(filters: SearchPropertyRecordDto) {
    const qb = this.propertyRecordRepo.createQueryBuilder('r');
    if (filters.q) {
      qb.where(
        '(r.barangay ILIKE :q OR r.lotNo ILIKE :q OR r.arpNo ILIKE :q OR r.titleNo ILIKE :q OR r.refPoint ILIKE :q)',
        { q: `%${filters.q}%` },
      );
    }

    qb.orderBy('r.createdAt', 'DESC');
    const [records, total] = await qb.getManyAndCount();
    const mappedRecords = records.map((record) => ({
      ...record,
      technicalDescription: Array.isArray(record.technicalDescription)
        ? record.technicalDescription
        : [],
    }));
    return { total, records: mappedRecords };
  }

  async remove(id: string, user: User) {
    const record = await this.propertyRecordRepo.findOne({ where: { id } });
    if (!record) {
      throw new NotFoundException('Property record not found');
    }
    await this.propertyRecordRepo.remove(record);
    await this.audit.log({
      userId: user?.id,
      action: 'DELETE_PROPERTY_RECORD',
      entity: 'property_record',
      entityId: id,
    });
    return { success: true };
  }
}
