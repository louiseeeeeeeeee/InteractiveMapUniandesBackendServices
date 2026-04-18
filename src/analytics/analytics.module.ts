import { TypeOrmModule } from '@nestjs/typeorm';
import { Module } from '@nestjs/common';
import { CrashEvent } from './entities/crash-event.entity';
import { LocationEvent } from './entities/location-event.entity';
import { UsageEvent } from './entities/usage-event.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([UsageEvent, CrashEvent, LocationEvent]),
  ],
  exports: [TypeOrmModule],
})
export class AnalyticsModule {}
