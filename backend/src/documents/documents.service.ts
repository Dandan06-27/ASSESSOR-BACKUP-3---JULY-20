import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { Document } from '../entities/document.entity';
import { User } from '../entities/user.entity';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(Document)
    private readonly docRepo: Repository<Document>,
    private readonly audit: AuditService,
  ) {}

  async saveMetadata(
    file: Express.Multer.File,
    landRecordId: string | undefined,
    user: User,
  ) {
    const relPath = `/storage/uploads/${file.filename}`;
    const doc = await this.docRepo.save(
      this.docRepo.create({
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        path: relPath,
        size: file.size,
        landRecordId: landRecordId || null,
        uploadedById: user.id,
      }),
    );
    await this.audit.log({
      userId: user.id,
      action: 'UPLOAD_DOCUMENT',
      entity: 'document',
      entityId: doc.id,
      details: { originalName: file.originalname },
    });
    return doc;
  }

  static ensureUploadDir() {
    const uploadDir = join(process.cwd(), '..', 'storage', 'uploads');
    if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });
    return uploadDir;
  }
}
