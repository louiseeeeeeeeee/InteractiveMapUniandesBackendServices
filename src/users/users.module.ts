import { TypeOrmModule } from '@nestjs/typeorm';
import { Module, forwardRef } from '@nestjs/common';
import { Schedule } from '../schedules/entities/schedule.entity';
import { SetupModule } from '../setup/setup.module';
import { AdminUsersController } from './admin-users.controller';
import { UserPreference } from './entities/user-preference.entity';
import { UserProfile } from './entities/user-profile.entity';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserProfile, UserPreference, Schedule]),
    forwardRef(() => SetupModule), // SetupGuard is reused for bootstrapping the first admin
  ],
  controllers: [AdminUsersController],
  providers: [UsersService],
  exports: [TypeOrmModule, UsersService],
})
export class UsersModule {}
