import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlacesModule } from '../places/places.module';
import { RoutesModule } from '../routes/routes.module';
import { RouteNode } from '../routes/entities/route-node.entity';
import { SetupController } from './setup.controller';
import { SetupGuard } from './setup.guard';
import { SetupService } from './setup.service';

@Module({
  imports: [PlacesModule, RoutesModule, TypeOrmModule.forFeature([RouteNode])],
  controllers: [SetupController],
  providers: [SetupService, SetupGuard],
})
export class SetupModule {}
