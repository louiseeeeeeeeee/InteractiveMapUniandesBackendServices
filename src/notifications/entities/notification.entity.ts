import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { TimestampedEntity } from '../../common/entities/timestamped.entity';
import { User } from '../../users/entities/user.entity';

// User-targeted notifications. Type is a free-form string ("class", "alert",
// "promo", ...). We deliberately don't use an enum because messages can be
// added by admins without a migration.
@Entity('notifications')
@Index(['user', 'createdAt'])
export class Notification extends TimestampedEntity {
  @ManyToOne(() => User, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User | null; // Null = broadcast to everyone

  @Column({ type: 'varchar', length: 40 })
  type: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  body?: string | null;

  @Column({ type: 'varchar', length: 8, nullable: true })
  icon?: string | null; // Emoji or icon hint

  @Column({ type: 'boolean', default: false })
  read: boolean;
}
