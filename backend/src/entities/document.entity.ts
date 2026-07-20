import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { LandRecord } from './land-record.entity';
import { User } from './user.entity';

@Entity('documents')
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  filename: string;

  @Column()
  originalName: string;

  @Column()
  mimeType: string;

  @Column()
  path: string;

  @Column({ type: 'int' })
  size: number;

  @ManyToOne(() => LandRecord, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'land_record_id' })
  landRecord: LandRecord | null;

  @Column('uuid', { nullable: true })
  landRecordId: string | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'uploaded_by_id' })
  uploadedBy: User;

  @Column('uuid')
  uploadedById: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
