import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Place } from '../places/entities/place.entity';
import { UsersModule } from '../users/users.module';
import { FavoritesController } from './favorites.controller';
import { Favorite } from './entities/favorite.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Favorite, Place]), UsersModule],
  controllers: [FavoritesController],
  exports: [TypeOrmModule],
})
export class FavoritesModule {}
