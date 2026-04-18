import { TypeOrmModule } from '@nestjs/typeorm';
import { Module } from '@nestjs/common';
import { UserPreference } from './entities/user-preference.entity';
import { UserProfile } from './entities/user-profile.entity';
import { User } from './entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserProfile, UserPreference])],
  exports: [TypeOrmModule],
})
export class UsersModule {}
