import { TimestampedEntity } from '../../common/entities/timestamped.entity';
import { Column, Entity, OneToMany } from 'typeorm';
import { AdClick } from './ad-click.entity';

@Entity('ads')
export class Ad extends TimestampedEntity {
  @Column()
  title: string;

  @Column({ type: 'varchar', nullable: true })
  imageUrl?: string | null;

  @Column({ type: 'varchar', nullable: true })
  targetUrl?: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  startsAt?: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  endsAt?: Date | null;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => AdClick, (adClick) => adClick.ad)
  clicks?: AdClick[];
}
