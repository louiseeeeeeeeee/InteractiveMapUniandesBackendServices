import { PlaceCategory } from '../../common/enums/place-category.enum';
import {
  BeforeInsert,
  BeforeUpdate,
  ChildEntity,
  Column,
  OneToMany,
} from 'typeorm';
import { Place } from './place.entity';
import { Review } from './review.entity';

@ChildEntity(PlaceCategory.RESTAURANT)
export class Restaurant extends Place {
  @Column({ type: 'int', nullable: true })
  priceLevel?: number | null;

  @Column({ type: 'double precision', nullable: true })
  averageRating?: number | null;

  @Column({ type: 'varchar', nullable: true })
  foodCategory?: string | null;

  @Column({ type: 'varchar', nullable: true })
  openingHours?: string | null;

  @OneToMany(() => Review, (review) => review.restaurant)
  reviews?: Review[];

  @BeforeInsert()
  @BeforeUpdate()
  assignCategory() {
    this.category = PlaceCategory.RESTAURANT;
  }
}
