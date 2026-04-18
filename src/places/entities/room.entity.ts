import { PlaceCategory } from '../../common/enums/place-category.enum';
import { ScheduledClass } from '../../schedules/entities/scheduled-class.entity';
import {
  BeforeInsert,
  BeforeUpdate,
  ChildEntity,
  Column,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { Building } from './building.entity';
import { Place } from './place.entity';

@ChildEntity(PlaceCategory.ROOM)
export class Room extends Place {
  @Column()
  roomCode: string;

  @Column({ type: 'varchar', nullable: true })
  floor?: string | null;

  @ManyToOne(() => Building, (building) => building.rooms, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'building_id' })
  building?: Building | null;

  @OneToMany(() => ScheduledClass, (scheduledClass) => scheduledClass.room)
  scheduledClasses?: ScheduledClass[];

  @BeforeInsert()
  @BeforeUpdate()
  assignCategory() {
    this.category = PlaceCategory.ROOM;
  }
}
