import { TypeOrmModule } from '@nestjs/typeorm';
import { Module } from '@nestjs/common';
import { Building } from '../places/entities/building.entity';
import { Place } from '../places/entities/place.entity';
import { ScheduledClass } from '../schedules/entities/scheduled-class.entity';
import { Edge } from './entities/edge.entity';
import { RouteNode } from './entities/route-node.entity';
import { Route } from './entities/route.entity';
import { RoutesController } from './routes.controller';
import { RoutesService } from './routes.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Route, RouteNode, Edge, Building, Place, ScheduledClass]),
  ],
  controllers: [RoutesController],
  providers: [RoutesService],
  exports: [TypeOrmModule, RoutesService],
})
export class RoutesModule {}
