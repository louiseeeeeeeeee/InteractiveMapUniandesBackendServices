import { TimestampedEntity } from '../../common/entities/timestamped.entity';
import { Column, Entity, ManyToMany } from 'typeorm';
import { ScheduledClass } from './scheduled-class.entity';

@Entity('instructors')
export class Instructor extends TimestampedEntity {
  @Column()
  fullName: string;

  @Column({ type: 'varchar', nullable: true })
  email?: string | null;

  @Column({ type: 'varchar', nullable: true })
  department?: string | null;

  @ManyToMany(() => ScheduledClass, (scheduledClass) => scheduledClass.instructors)
  classes?: ScheduledClass[];
}
