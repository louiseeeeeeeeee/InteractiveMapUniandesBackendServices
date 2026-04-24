import { TypeOrmModule } from '@nestjs/typeorm';
import { Module } from '@nestjs/common';
import { Building } from './entities/building.entity';
import { Place } from './entities/place.entity';
import { Restaurant } from './entities/restaurant.entity';
import { Review } from './entities/review.entity';
import { Room } from './entities/room.entity';
import { PlacesController } from './places.controller';
import { PlacesService } from './places.service';
import { RestaurantsController } from './restaurants.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Place, Building, Room, Restaurant, Review]),
  ],
  controllers: [PlacesController, RestaurantsController],
  providers: [PlacesService],
  exports: [TypeOrmModule, PlacesService],
})
export class PlacesModule {}
