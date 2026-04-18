import { PlaceCategory } from '../../common/enums/place-category.enum';
import {
  BeforeInsert,
  BeforeUpdate,
  ChildEntity,
  Column,
  OneToMany,
} from 'typeorm';
import { Room } from './room.entity';
import { Place } from './place.entity';

@ChildEntity(PlaceCategory.BUILDING)
export class Building extends Place {
  @Column({ unique: true })
  code: string;

  @Column({ type: 'simple-array', nullable: true })
  aliases?: string[] | null;

  @Column({ type: 'varchar', nullable: true })
  description?: string | null;

  @OneToMany(() => Room, (room) => room.building)
  rooms?: Room[];

  @BeforeInsert()
  @BeforeUpdate()
  assignCategory() {
    this.category = PlaceCategory.BUILDING;
  }
}
