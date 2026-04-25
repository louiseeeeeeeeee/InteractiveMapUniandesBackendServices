import { TypeOrmModule } from '@nestjs/typeorm';
import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { AdsController } from './ads.controller';
import { AdClick } from './entities/ad-click.entity';
import { Ad } from './entities/ad.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Ad, AdClick]), UsersModule],
  controllers: [AdsController],
  exports: [TypeOrmModule],
})
export class AdsModule {}
