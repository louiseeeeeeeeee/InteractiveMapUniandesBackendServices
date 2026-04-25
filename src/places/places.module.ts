import { TypeOrmModule } from '@nestjs/typeorm';
import { Module, forwardRef } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { Building } from './entities/building.entity';
import { Place } from './entities/place.entity';
import { Restaurant } from './entities/restaurant.entity';
import { Review } from './entities/review.entity';
import { Room } from './entities/room.entity';
import { AdminPlacesController } from './admin-places.controller';
import { PlacesController } from './places.controller';
import { PlacesService } from './places.service';
import { RestaurantsController } from './restaurants.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Place, Building, Room, Restaurant, Review]),
    forwardRef(() => UsersModule), // Needed for FirebaseAuthGuard on POST reviews
  ],
  controllers: [PlacesController, RestaurantsController, AdminPlacesController],
  providers: [PlacesService],
  exports: [TypeOrmModule, PlacesService],
})
export class PlacesModule {}
