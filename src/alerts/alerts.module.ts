import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Place } from '../places/entities/place.entity';
import { UsersModule } from '../users/users.module';
import { AlertsController } from './alerts.controller';
import { Alert } from './entities/alert.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Alert, Place]),
    forwardRef(() => UsersModule), // FirebaseAuthGuard on admin-only endpoints needs UsersService
  ],
  controllers: [AlertsController],
  exports: [TypeOrmModule],
})
export class AlertsModule {}
