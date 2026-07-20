import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserRole, UserStatus } from '../common/enums';
import { Division } from './division.entity';
import { Notification } from './notification.entity';
import { Role } from './role.entity';
import { Task } from './task.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ select: false })
  password: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.PENDING })
  status: UserStatus;

  @Column({ nullable: true })
  profilePicture: string;

  @Column()
  fullName: string;

  @Column({ nullable: true })
  position: string;

  @Column({ nullable: true })
  contactNumber: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ type: 'text', nullable: true })
  bio: string;

  @ManyToOne(() => Division, (division) => division.users, { nullable: true })
  @JoinColumn({ name: 'division_id' })
  division: Division | null;

  @Column('uuid', { nullable: true })
  divisionId: string | null;

  @Column('uuid', { nullable: true })
  orgParentId: string | null;

  @Column({ default: 0 })
  orgSortOrder: number;

  @OneToMany(() => Notification, (n) => n.user)
  notifications: Notification[];

  @ManyToMany(() => Role, (role) => role.users, { eager: true })
  @JoinTable({
    name: 'user_roles',
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'role_id', referencedColumnName: 'id' },
  })
  roles: Role[];

  @OneToMany(() => Task, (t) => t.assignee)
  assignedTasks: Task[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
