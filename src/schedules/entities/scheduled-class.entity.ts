import { TimestampedEntity } from '../../common/entities/timestamped.entity';
import { Room } from '../../places/entities/room.entity';
import {
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToOne,
} from 'typeorm';
import { Instructor } from './instructor.entity';
import { RecurrenceRule } from './recurrence-rule.entity';
import { Schedule } from './schedule.entity';

@Entity('scheduled_classes')
export class ScheduledClass extends TimestampedEntity {
  @ManyToOne(() => Schedule, (schedule) => schedule.classes, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'schedule_id' })
  schedule: Schedule;

  @Column()
  title: string;

  @Column({ type: 'varchar', nullable: true })
  courseCode?: string | null;

  @Column({ type: 'varchar', nullable: true })
  section?: string | null;

  @Column({ type: 'varchar', nullable: true })
  nrc?: string | null;

  @Column({ type: 'timestamptz' })
  startsAt: Date;

  @Column({ type: 'timestamptz' })
  endsAt: Date;

  @Column({ default: 'America/Bogota' })
  timezone: string;

  @Column({ type: 'varchar', nullable: true })
  externalUid?: string | null;

  @Column({ type: 'varchar', nullable: true })
  rawLocation?: string | null;

  @Column({ type: 'text', nullable: true })
  rawDescription?: string | null;

  @ManyToOne(() => Room, (room) => room.scheduledClasses, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'room_id' })
  room?: Room | null;

  @ManyToMany(() => Instructor, (instructor) => instructor.classes)
  @JoinTable({
    name: 'scheduled_class_instructors',
    joinColumn: {
      name: 'scheduled_class_id',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'instructor_id',
      referencedColumnName: 'id',
    },
  })
  instructors?: Instructor[];

  @OneToOne(
    () => RecurrenceRule,
    (recurrenceRule) => recurrenceRule.scheduledClass,
    {
      cascade: true,
      nullable: true,
    },
  )
  recurrenceRule?: RecurrenceRule | null;
}
