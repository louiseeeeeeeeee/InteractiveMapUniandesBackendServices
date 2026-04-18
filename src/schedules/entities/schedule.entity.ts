import { TimestampedEntity } from '../../common/entities/timestamped.entity';
import { ScheduleSourceType } from '../../common/enums/schedule-source-type.enum';
import { User } from '../../users/entities/user.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { ScheduledClass } from './scheduled-class.entity';

@Entity('schedules')
export class Schedule extends TimestampedEntity {
  @ManyToOne(() => User, (user) => user.schedules, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  name: string;

  @Column({ default: 'America/Bogota' })
  timezone: string;

  @Column({
    type: 'enum',
    enum: ScheduleSourceType,
    default: ScheduleSourceType.ICS_UPLOAD,
  })
  sourceType: ScheduleSourceType;

  @Column({ type: 'varchar', nullable: true })
  sourceUrl?: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  importedAt?: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  lastUpdatedAt?: Date | null;

  @OneToMany(() => ScheduledClass, (scheduledClass) => scheduledClass.schedule)
  classes?: ScheduledClass[];
}
