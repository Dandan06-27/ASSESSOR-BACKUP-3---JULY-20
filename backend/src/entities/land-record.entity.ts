import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ClassificationCode } from '../common/enums';
import { User } from './user.entity';

@Entity('land_records')
export class LandRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  assessorsLotNo: string;

  @Column()
  cadastralLotNo: string;

  @Column({ nullable: true })
  tdNo: string;

  @Column({ nullable: true })
  newPin: string;

  @Column({ nullable: true })
  fid: string;

  @Column({ nullable: true })
  pin: string;

  @Column({ nullable: true })
  sectionNo: string;

  @Column({ nullable: true })
  arpA: string;

  @Column({ nullable: true })
  arpB: string;

  @Column({ nullable: true })
  arpC: string;

  @Column({ nullable: true })
  arpD: string;

  @Column({ nullable: true })
  arpE: string;

  @Column({ nullable: true })
  arpF: string;

  @Column()
  nameOfOwner: string;

  @Column({ nullable: true })
  titleNo: string;

  @Column({ type: 'decimal', precision: 14, scale: 2, nullable: true })
  areaSqm: number;

  @Column({ type: 'enum', enum: ClassificationCode, nullable: true })
  classificationCode: ClassificationCode;

  @Column({ type: 'int', default: 0 })
  improvement: number;

  @Column({ nullable: true })
  buildingNo: string;

  @Column({ nullable: true })
  mch: string;

  @Column({ nullable: true })
  oth: string;

  @Column({ nullable: true })
  conveyance: string;

  @Column({ nullable: true })
  eff: string;

  @Column({ nullable: true })
  location: string;

  @Column({ nullable: true })
  declarant: string;

  @Column({ nullable: true })
  indexNo: string;

  @Column()
  barangay: string;

  @Column({ type: 'text', nullable: true })
  remarks: string;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitude: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User;

  @Column({ nullable: true })
  createdById: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
