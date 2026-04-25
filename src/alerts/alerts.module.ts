import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Place } from '../places/entities/place.entity';
import { AlertsController } from './alerts.controller';
import { Alert } from './entities/alert.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Alert, Place])],
  controllers: [AlertsController],
  exports: [TypeOrmModule],
})
export class AlertsModule {}
