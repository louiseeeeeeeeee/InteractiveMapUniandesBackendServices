import { TimestampedEntity } from '../../common/entities/timestamped.entity';
import { PlaceCategory } from '../../common/enums/place-category.enum';
import { Route } from '../../routes/entities/route.entity';
import { RouteNode } from '../../routes/entities/route-node.entity';
import {
  Column,
  Entity,
  OneToMany,
  TableInheritance,
} from 'typeorm';

@Entity('places')
@TableInheritance({
  column: { type: 'varchar', name: 'place_type' },
})
export class Place extends TimestampedEntity {
  @Column()
  name: string;

  @Column({ type: 'double precision', nullable: true })
  latitude?: number | null;

  @Column({ type: 'double precision', nullable: true })
  longitude?: number | null;

  @Column({ type: 'varchar', nullable: true })
  gridReference?: string | null;

  @Column({ type: 'varchar', nullable: true })
  photoUrl?: string | null;

  @Column({
    type: 'enum',
    enum: PlaceCategory,
    default: PlaceCategory.GENERIC,
  })
  category: PlaceCategory;

  @OneToMany(() => Route, (route) => route.originPlace)
  originRoutes?: Route[];

  @OneToMany(() => Route, (route) => route.destinationPlace)
  destinationRoutes?: Route[];

  @OneToMany(() => RouteNode, (routeNode) => routeNode.place)
  routeNodes?: RouteNode[];
}
