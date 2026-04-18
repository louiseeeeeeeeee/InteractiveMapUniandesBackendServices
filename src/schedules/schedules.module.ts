import { TypeOrmModule } from '@nestjs/typeorm';
import { Module } from '@nestjs/common';
import { Room } from '../places/entities/room.entity';
import { PlacesModule } from '../places/places.module';
import { User } from '../users/entities/user.entity';
import { UsersModule } from '../users/users.module';
import { Instructor } from './entities/instructor.entity';
import { RecurrenceRule } from './entities/recurrence-rule.entity';
import { Schedule } from './entities/schedule.entity';
import { ScheduledClass } from './entities/scheduled-class.entity';
import { IcsParserService } from './ics-parser.service';
import { SchedulesController } from './schedules.controller';
import { SchedulesService } from './schedules.service';

@Module({
  imports: [
    UsersModule,
    PlacesModule,
    TypeOrmModule.forFeature([
      Schedule,
      ScheduledClass,
      RecurrenceRule,
      Instructor,
      User,
      Room,
    ]),
  ],
  controllers: [SchedulesController],
  providers: [SchedulesService, IcsParserService],
  exports: [TypeOrmModule, SchedulesService, IcsParserService],
})
export class SchedulesModule {}
