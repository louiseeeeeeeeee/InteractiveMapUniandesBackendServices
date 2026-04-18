import { TimestampedEntity } from '../../common/entities/timestamped.entity';
import { User } from '../../users/entities/user.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { Ad } from './ad.entity';

@Entity('ad_clicks')
export class AdClick extends TimestampedEntity {
  @ManyToOne(() => Ad, (ad) => ad.clicks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ad_id' })
  ad: Ad;

  @ManyToOne(() => User, (user) => user.adClicks, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'user_id' })
  user?: User | null;

  @Column({
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  clickedAt: Date;

  @Column({ type: 'varchar', nullable: true })
  source?: string | null;
}
