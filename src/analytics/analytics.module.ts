import { TypeOrmModule } from '@nestjs/typeorm';
import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { AnalyticsController } from './analytics.controller';
import { CrashEvent } from './entities/crash-event.entity';
import { LocationEvent } from './entities/location-event.entity';
import { UsageEvent } from './entities/usage-event.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([UsageEvent, CrashEvent, LocationEvent]),
    UsersModule, // Needed so FirebaseAuthGuard can resolve UsersService
  ],
  controllers: [AnalyticsController],
  exports: [TypeOrmModule],
})
export class AnalyticsModule {}
