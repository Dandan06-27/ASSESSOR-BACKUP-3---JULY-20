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

@Entity('tracer_motherlots')
export class MotherLot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  lotNumber: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column()
  barangay: string;

  @Column()
  section: string;

  @Column({ nullable: true })
  area: string;

  @Column({ type: 'text', nullable: true })
  remarks: string;

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
