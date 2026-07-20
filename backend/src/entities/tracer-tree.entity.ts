import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity({ name: 'tracer_tree' })
export class TracerTree {
  @PrimaryColumn({ type: 'varchar', default: 'default' })
  id: string;

  @Column({ type: 'jsonb', nullable: false, default: {} })
  treeData: any;
}
