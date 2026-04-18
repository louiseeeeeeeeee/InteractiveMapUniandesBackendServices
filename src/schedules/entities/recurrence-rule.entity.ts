import { TimestampedEntity } from '../../common/entities/timestamped.entity';
import { RecurrenceFrequency } from '../../common/enums/recurrence-frequency.enum';
import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { ScheduledClass } from './scheduled-class.entity';

@Entity('recurrence_rules')
export class RecurrenceRule extends TimestampedEntity {
  @Column({
    type: 'enum',
    enum: RecurrenceFrequency,
    default: RecurrenceFrequency.WEEKLY,
  })
  frequency: RecurrenceFrequency;

  @Column({ default: 1 })
  interval: number;

  @Column({ type: 'simple-array', nullable: true })
  byDay?: string[] | null;

  @Column({ type: 'timestamptz', nullable: true })
  untilDate?: Date | null;

  @Column({ default: 'America/Bogota' })
  timezone: string;

  @OneToOne(
    () => ScheduledClass,
    (scheduledClass) => scheduledClass.recurrenceRule,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'scheduled_class_id' })
  scheduledClass: ScheduledClass;
}
