import { TimestampedEntity } from '../../common/entities/timestamped.entity';
import { Place } from '../../places/entities/place.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { Edge } from './edge.entity';
import { Route } from './route.entity';

@Entity('route_nodes')
export class RouteNode extends TimestampedEntity {
  @ManyToOne(() => Route, (route) => route.nodes, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'route_id' })
  route?: Route | null;

  @ManyToOne(() => Place, (place) => place.routeNodes, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'place_id' })
  place?: Place | null;

  @Column({ unique: true })
  label: string;

  @Column({ type: 'double precision', nullable: true })
  latitude?: number | null;

  @Column({ type: 'double precision', nullable: true })
  longitude?: number | null;

  @Column({ type: 'int', nullable: true })
  sequence?: number | null;

  @Column({ default: true })
  isCampusGraphNode: boolean;

  @OneToMany(() => Edge, (edge) => edge.fromNode)
  outgoingEdges?: Edge[];

  @OneToMany(() => Edge, (edge) => edge.toNode)
  incomingEdges?: Edge[];
}
