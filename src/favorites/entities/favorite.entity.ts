import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { TimestampedEntity } from '../../common/entities/timestamped.entity';
import { Place } from '../../places/entities/place.entity';
import { User } from '../../users/entities/user.entity';

// One row per (user, place). Sprint 1 FS2: "Save to Favorites".
@Entity('favorites')
@Unique('UQ_fav_user_place', ['user', 'place'])
export class Favorite extends TimestampedEntity {
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Place, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'place_id' })
  place: Place;

  @Column({ type: 'varchar', length: 200, nullable: true })
  note?: string | null; // Optional user note
}
