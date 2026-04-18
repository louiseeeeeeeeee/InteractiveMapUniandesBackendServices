import { TypeOrmModule } from '@nestjs/typeorm';
import { Module } from '@nestjs/common';
import { AdClick } from './entities/ad-click.entity';
import { Ad } from './entities/ad.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Ad, AdClick])],
  exports: [TypeOrmModule],
})
export class AdsModule {}
