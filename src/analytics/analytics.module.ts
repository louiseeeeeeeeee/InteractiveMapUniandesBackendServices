import { TypeOrmModule } from '@nestjs/typeorm';
import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { CrashEvent } from './entities/crash-event.entity';
import { LocationEvent } from './entities/location-event.entity';
import { UsageEvent } from './entities/usage-event.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([UsageEvent, CrashEvent, LocationEvent]),
  ],
  controllers: [AnalyticsController],
  exports: [TypeOrmModule],
})
export class AnalyticsModule {}
