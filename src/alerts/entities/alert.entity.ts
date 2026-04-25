import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { TimestampedEntity } from '../../common/entities/timestamped.entity';
import { Place } from '../../places/entities/place.entity';

// Campus-wide alerts: closed routes, building maintenance, weather warnings.
// Visible to everyone, optionally tied to a place.
@Entity('alerts')
@Index(['active', 'createdAt'])
export class Alert extends TimestampedEntity {
  @Column({ type: 'varchar', length: 40 })
  type: string; // "closure" | "weather" | "maintenance" | ...

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  body?: string | null;

  @Column({ type: 'varchar', length: 8, nullable: true })
  icon?: string | null;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @ManyToOne(() => Place, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'place_id' })
  place?: Place | null;
}
