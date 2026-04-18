import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { promises as fs } from 'fs';
import { join } from 'path';
import { ILike, Repository } from 'typeorm';
import { AuthProvider } from '../common/enums/auth-provider.enum';
import { ScheduleSourceType } from '../common/enums/schedule-source-type.enum';
import { Room } from '../places/entities/room.entity';
import { User } from '../users/entities/user.entity';
import { ImportScheduleDto } from './dto/import-schedule.dto';
import { ListSchedulesDto } from './dto/list-schedules.dto';
import { Instructor } from './entities/instructor.entity';
import { RecurrenceRule } from './entities/recurrence-rule.entity';
import { Schedule } from './entities/schedule.entity';
import { ScheduledClass } from './entities/scheduled-class.entity';
import { IcsParserService } from './ics-parser.service';
import { ParsedIcsEvent } from './interfaces/parsed-ics.interface';

@Injectable()
export class SchedulesService {
  constructor(
    @InjectRepository(Schedule)
    private readonly scheduleRepository: Repository<Schedule>,
    @InjectRepository(ScheduledClass)
    private readonly scheduledClassRepository: Repository<ScheduledClass>,
    @InjectRepository(RecurrenceRule)
    private readonly recurrenceRuleRepository: Repository<RecurrenceRule>,
    @InjectRepository(Instructor)
    private readonly instructorRepository: Repository<Instructor>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Room)
    private readonly roomRepository: Repository<Room>,
    private readonly icsParserService: IcsParserService,
  ) {}

  async importSchedule(
    dto: ImportScheduleDto,
    fileBuffer?: Buffer,
    fileName?: string,
  ) {
    const user = await this.resolveUser(dto);
    const rawIcsContent = await this.resolveIcsContent(dto, fileBuffer);
    const parsedCalendar = this.icsParserService.parse(rawIcsContent);

    if (parsedCalendar.events.length === 0) {
      throw new BadRequestException(
        'The provided .ics file did not contain any class events.',
      );
    }

    const replaceExisting = this.parseBoolean(dto.replaceExisting);
    const scheduleName =
      dto.name?.trim() ??
      fileName?.replace(/\.ics$/i, '').trim() ??
      'Imported schedule';

    if (replaceExisting) {
      await this.deleteExistingSchedule(user.id, scheduleName);
    }

    const now = new Date();
    const schedule = await this.scheduleRepository.save(
      this.scheduleRepository.create({
        user,
        name: scheduleName,
        timezone: dto.timezone?.trim() || parsedCalendar.timezone,
        sourceType: ScheduleSourceType.ICS_UPLOAD,
        sourceUrl: dto.sourceUrl?.trim() || null,
        importedAt: now,
        lastUpdatedAt: now,
      }),
    );

    for (const parsedEvent of parsedCalendar.events) {
      const savedClass = await this.createScheduledClass(schedule, parsedEvent);

      if (parsedEvent.recurrenceRule) {
        await this.recurrenceRuleRepository.save(
          this.recurrenceRuleRepository.create({
            frequency: parsedEvent.recurrenceRule.frequency,
            interval: parsedEvent.recurrenceRule.interval,
            byDay: parsedEvent.recurrenceRule.byDay,
            untilDate: parsedEvent.recurrenceRule.untilDate,
            timezone: parsedEvent.recurrenceRule.timezone,
            scheduledClass: savedClass,
          }),
        );
      }
    }

    return this.getScheduleById(schedule.id);
  }

  async importDefaultSchedule(dto: ImportScheduleDto) {
    const defaultContent = await this.readDefaultIcsFile();

    return this.importSchedule(
      dto,
      Buffer.from(defaultContent, 'utf8'),
      'SEGUNDO SEMESTRE 2026.ics',
    );
  }

  async listSchedules(query: ListSchedulesDto) {
    const whereClause = query.userId
      ? { user: { id: query.userId } }
      : query.userEmail
        ? { user: { email: query.userEmail } }
        : undefined;

    return this.scheduleRepository.find({
      where: whereClause,
      relations: {
        user: true,
        classes: {
          room: {
            building: true,
          },
          instructors: true,
          recurrenceRule: true,
        },
      },
      order: {
        importedAt: 'DESC',
        classes: {
          startsAt: 'ASC',
        },
      },
    });
  }

  async getScheduleById(id: string) {
    const schedule = await this.scheduleRepository.findOne({
      where: { id },
      relations: {
        user: true,
        classes: {
          room: {
            building: true,
          },
          instructors: true,
          recurrenceRule: true,
        },
      },
      order: {
        classes: {
          startsAt: 'ASC',
        },
      },
    });

    if (!schedule) {
      throw new NotFoundException(`Schedule with id "${id}" was not found.`);
    }

    return schedule;
  }

  private async createScheduledClass(
    schedule: Schedule,
    parsedEvent: ParsedIcsEvent,
  ) {
    const instructors = await this.resolveInstructors(parsedEvent.instructors);
    const room = await this.resolveRoom(parsedEvent.location?.roomCode);

    return this.scheduledClassRepository.save(
      this.scheduledClassRepository.create({
        schedule,
        title: parsedEvent.title,
        courseCode: parsedEvent.courseCode ?? null,
        section: parsedEvent.section ?? null,
        nrc: parsedEvent.nrc ?? null,
        startsAt: parsedEvent.startsAt,
        endsAt: parsedEvent.endsAt,
        timezone: parsedEvent.timezone,
        externalUid: parsedEvent.uid ?? null,
        rawLocation: parsedEvent.location?.raw ?? null,
        rawDescription: parsedEvent.description ?? null,
        room,
        instructors,
      }),
    );
  }

  private async resolveUser(dto: ImportScheduleDto) {
    if (dto.userId) {
      const existingUser = await this.userRepository.findOne({
        where: { id: dto.userId },
      });

      if (!existingUser) {
        throw new NotFoundException(`User with id "${dto.userId}" was not found.`);
      }

      return existingUser;
    }

    if (!dto.userEmail?.trim()) {
      throw new BadRequestException(
        'userId or userEmail is required to import a schedule.',
      );
    }

    const email = dto.userEmail.trim().toLowerCase();
    const existingUser = await this.userRepository.findOne({
      where: { email },
    });

    if (existingUser) {
      return existingUser;
    }

    return this.userRepository.save(
      this.userRepository.create({
        email,
        authProvider: dto.authProvider ?? AuthProvider.MICROSOFT,
      }),
    );
  }

  private async resolveIcsContent(
    dto: ImportScheduleDto,
    fileBuffer?: Buffer,
  ): Promise<string> {
    if (dto.icsContent?.trim()) {
      return dto.icsContent;
    }

    if (fileBuffer?.length) {
      return fileBuffer.toString('utf8');
    }

    throw new BadRequestException(
      'Provide icsContent in the body or upload a .ics file.',
    );
  }

  private async resolveInstructors(instructorNames: string[]) {
    const instructors: Instructor[] = [];

    for (const fullName of instructorNames) {
      const normalizedName = fullName.trim();

      if (!normalizedName) {
        continue;
      }

      const existingInstructor = await this.instructorRepository.findOne({
        where: { fullName: ILike(normalizedName) },
      });

      if (existingInstructor) {
        instructors.push(existingInstructor);
        continue;
      }

      const savedInstructor = await this.instructorRepository.save(
        this.instructorRepository.create({
          fullName: normalizedName,
        }),
      );

      instructors.push(savedInstructor);
    }

    return instructors;
  }

  private async resolveRoom(roomCode?: string) {
    if (!roomCode?.trim()) {
      return null;
    }

    return this.roomRepository.findOne({
      where: { roomCode: ILike(roomCode.trim()) },
      relations: {
        building: true,
      },
    });
  }

  private async deleteExistingSchedule(userId: string, scheduleName: string) {
    const existingSchedule = await this.scheduleRepository.findOne({
      where: {
        user: { id: userId },
        name: scheduleName,
      },
    });

    if (existingSchedule) {
      await this.scheduleRepository.remove(existingSchedule);
    }
  }

  private parseBoolean(value?: boolean | string): boolean {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }

    return false;
  }

  private async readDefaultIcsFile() {
    const candidatePaths = [
      join(process.cwd(), 'src', 'utils', 'SEGUNDO SEMESTRE 2026.ics'),
      join(process.cwd(), 'dist', 'utils', 'SEGUNDO SEMESTRE 2026.ics'),
      join(process.cwd(), 'utils', 'SEGUNDO SEMESTRE 2026.ics'),
    ];

    for (const candidatePath of candidatePaths) {
      try {
        return await fs.readFile(candidatePath, 'utf8');
      } catch {
        continue;
      }
    }

    throw new NotFoundException(
      'Default .ics file was not found in src/utils or dist/utils.',
    );
  }
}
