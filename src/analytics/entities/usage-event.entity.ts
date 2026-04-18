import { TimestampedEntity } from '../../common/entities/timestamped.entity';
import { User } from '../../users/entities/user.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
} from 'typeorm';

@Entity('usage_events')
export class UsageEvent extends TimestampedEntity {
  @ManyToOne(() => User, (user) => user.usageEvents, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'user_id' })
  user?: User | null;

  @Column()
  eventType: string;

  @Column({ type: 'varchar', nullable: true })
  feature?: string | null;

  @Column({ type: 'jsonb', nullable: true })
  payload?: Record<string, unknown> | null;

  @Column({
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  occurredAt: Date;
}
