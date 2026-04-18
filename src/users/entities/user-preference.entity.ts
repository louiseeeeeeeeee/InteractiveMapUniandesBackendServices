import { TimestampedEntity } from '../../common/entities/timestamped.entity';
import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { User } from './user.entity';

@Entity('user_preferences')
export class UserPreference extends TimestampedEntity {
  @Column({ default: 'es-CO' })
  language: string;

  @Column({ default: false })
  darkModeEnabled: boolean;

  @Column({ default: true })
  notificationsEnabled: boolean;

  @Column({ default: true })
  usesMetricUnits: boolean;

  @OneToOne(() => User, (user) => user.preference, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
