import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('property_records')
export class PropertyRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  barangay: string;

  @Column({ nullable: true })
  lotNo: string;

  @Column({ nullable: true })
  arpNo: string;

  @Column({ nullable: true })
  titleNo: string;

  @Column({ nullable: true })
  refPoint: string;

  @Column({ nullable: true })
  distance: string;

  @Column({ nullable: true })
  degree: string;

  @Column({ nullable: true })
  minutes: string;

  @Column({ type: 'jsonb', nullable: true })
  technicalDescription: Record<string, any>[];

  @Column({ type: 'jsonb', nullable: true })
  tieLine: Record<string, any>;

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
