import { TimestampedEntity } from '../../common/entities/timestamped.entity';
import { TravelMode } from '../../common/enums/travel-mode.enum';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { RouteNode } from './route-node.entity';
import { Route } from './route.entity';

@Entity('edges')
export class Edge extends TimestampedEntity {
  @ManyToOne(() => Route, (route) => route.edges, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'route_id' })
  route?: Route | null;

  @ManyToOne(() => RouteNode, (routeNode) => routeNode.outgoingEdges, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'from_node_id' })
  fromNode: RouteNode;

  @ManyToOne(() => RouteNode, (routeNode) => routeNode.incomingEdges, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'to_node_id' })
  toNode: RouteNode;

  @Column({ type: 'double precision', nullable: true })
  distanceMeters?: number | null;

  @Column({ type: 'int' })
  travelTimeSeconds: number;

  @Column({ type: 'double precision', nullable: true })
  estimatedDurationMinutes?: number | null;

  @Column({
    type: 'enum',
    enum: TravelMode,
    default: TravelMode.WALKING,
  })
  travelMode: TravelMode;

  @Column({ default: false })
  isAccessible: boolean;

  @Column({ default: true })
  isCampusGraphEdge: boolean;
}
