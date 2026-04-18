import { TimestampedEntity } from '../../common/entities/timestamped.entity';
import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { User } from './user.entity';

@Entity('user_profiles')
export class UserProfile extends TimestampedEntity {
  @Column()
  fullName: string;

  @Column({ type: 'varchar', nullable: true })
  program?: string | null;

  @Column({ type: 'varchar', nullable: true })
  profileImage?: string | null;

  @OneToOne(() => User, (user) => user.profile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
