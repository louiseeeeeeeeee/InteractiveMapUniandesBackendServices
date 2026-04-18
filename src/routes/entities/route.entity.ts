import { TimestampedEntity } from '../../common/entities/timestamped.entity';
import { Place } from '../../places/entities/place.entity';
import { User } from '../../users/entities/user.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { Edge } from './edge.entity';
import { RouteNode } from './route-node.entity';

@Entity('routes')
export class Route extends TimestampedEntity {
  @ManyToOne(() => User, (user) => user.routes, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'user_id' })
  user?: User | null;

  @Column({ type: 'varchar', nullable: true })
  label?: string | null;

  @ManyToOne(() => Place, (place) => place.originRoutes, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'origin_place_id' })
  originPlace?: Place | null;

  @ManyToOne(() => Place, (place) => place.destinationRoutes, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'destination_place_id' })
  destinationPlace?: Place | null;

  @Column({ type: 'double precision', nullable: true })
  totalDistanceMeters?: number | null;

  @Column({ type: 'double precision', nullable: true })
  estimatedDurationMinutes?: number | null;

  @OneToMany(() => RouteNode, (routeNode) => routeNode.route)
  nodes?: RouteNode[];

  @OneToMany(() => Edge, (edge) => edge.route)
  edges?: Edge[];
}
