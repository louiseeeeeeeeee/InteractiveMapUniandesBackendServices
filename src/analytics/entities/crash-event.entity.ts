import { TimestampedEntity } from '../../common/entities/timestamped.entity';
import { User } from '../../users/entities/user.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
} from 'typeorm';

@Entity('crash_events')
export class CrashEvent extends TimestampedEntity {
  @ManyToOne(() => User, (user) => user.crashEvents, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'user_id' })
  user?: User | null;

  @Column()
  message: string;

  @Column({ type: 'text', nullable: true })
  stackTrace?: string | null;

  @Column({ type: 'varchar', nullable: true })
  appVersion?: string | null;

  @Column({ type: 'jsonb', nullable: true })
  deviceInfo?: Record<string, unknown> | null;

  @Column({
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  occurredAt: Date;
}
