import { AdClick } from '../../ads/entities/ad-click.entity';
import { CrashEvent } from '../../analytics/entities/crash-event.entity';
import { LocationEvent } from '../../analytics/entities/location-event.entity';
import { UsageEvent } from '../../analytics/entities/usage-event.entity';
import { TimestampedEntity } from '../../common/entities/timestamped.entity';
import { AuthProvider } from '../../common/enums/auth-provider.enum';
import { Review } from '../../places/entities/review.entity';
import { Route } from '../../routes/entities/route.entity';
import { Schedule } from '../../schedules/entities/schedule.entity';
import { Column, Entity, OneToMany, OneToOne } from 'typeorm';
import { UserPreference } from './user-preference.entity';
import { UserProfile } from './user-profile.entity';

@Entity('users')
export class User extends TimestampedEntity {
  @Column({ unique: true })
  email: string;

  @Column({
    type: 'enum',
    enum: AuthProvider,
    default: AuthProvider.MICROSOFT,
  })
  authProvider: AuthProvider;

  @OneToOne(() => UserProfile, (profile) => profile.user)
  profile?: UserProfile;

  @OneToOne(() => UserPreference, (preference) => preference.user)
  preference?: UserPreference;

  @OneToMany(() => Schedule, (schedule) => schedule.user)
  schedules?: Schedule[];

  @OneToMany(() => Review, (review) => review.user)
  reviews?: Review[];

  @OneToMany(() => Route, (route) => route.user)
  routes?: Route[];

  @OneToMany(() => UsageEvent, (usageEvent) => usageEvent.user)
  usageEvents?: UsageEvent[];

  @OneToMany(() => CrashEvent, (crashEvent) => crashEvent.user)
  crashEvents?: CrashEvent[];

  @OneToMany(() => LocationEvent, (locationEvent) => locationEvent.user)
  locationEvents?: LocationEvent[];

  @OneToMany(() => AdClick, (adClick) => adClick.user)
  adClicks?: AdClick[];
}
