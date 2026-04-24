import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../firebase/current-user.decorator';
import { FirebaseAuthGuard } from '../firebase/firebase-auth.guard';
import type { AuthenticatedUserContext } from '../firebase/interfaces/authenticated-user-context.interface';
import { ImportMyScheduleDto } from './dto/import-my-schedule.dto';
import { MeService } from './me.service';
import { MyClassPathDto } from './dto/my-class-path.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@ApiTags('me')
@ApiBearerAuth('firebase')
@UseGuards(FirebaseAuthGuard)
@Controller('me')
export class MeController {
  constructor(private readonly meService: MeService) {}

  @Get()
  @ApiOperation({ summary: 'Get the authenticated user and their latest schedule summary' })
  getMe(@CurrentUser() currentUser: AuthenticatedUserContext) {
    return this.meService.getMe(currentUser);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update the authenticated user profile (name, program, picture)' })
  updateProfile(
    @CurrentUser() currentUser: AuthenticatedUserContext,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.meService.updateProfile(currentUser, dto);
  }

  @Patch('preferences')
  @ApiOperation({ summary: 'Update the authenticated user preferences (language, dark mode, etc)' })
  updatePreferences(
    @CurrentUser() currentUser: AuthenticatedUserContext,
    @Body() dto: UpdatePreferencesDto,
  ) {
    return this.meService.updatePreferences(currentUser, dto);
  }

  @Get('schedules')
  @ApiOperation({ summary: 'List schedules for the authenticated user' })
  listSchedules(@CurrentUser() currentUser: AuthenticatedUserContext) {
    return this.meService.listSchedules(currentUser);
  }

  @Get('schedules/current')
  @ApiOperation({ summary: 'Get the latest imported schedule for the authenticated user' })
  getCurrentSchedule(@CurrentUser() currentUser: AuthenticatedUserContext) {
    return this.meService.getCurrentSchedule(currentUser);
  }

  @Get('schedules/current/classes')
  @ApiOperation({ summary: 'List classes from the authenticated user latest schedule' })
  listCurrentScheduleClasses(
    @CurrentUser() currentUser: AuthenticatedUserContext,
  ) {
    return this.meService.listCurrentScheduleClasses(currentUser);
  }

  @Get('classes/next')
  @ApiOperation({ summary: 'Get the next upcoming class for the authenticated user' })
  getNextClass(@CurrentUser() currentUser: AuthenticatedUserContext) {
    return this.meService.getNextClass(currentUser);
  }

  @Get('classes/today')
  @ApiOperation({ summary: 'List classes scheduled for today for the authenticated user' })
  listTodayClasses(@CurrentUser() currentUser: AuthenticatedUserContext) {
    return this.meService.listTodayClasses(currentUser);
  }

  @Post('schedules/import/default')
  @ApiOperation({ summary: 'Import the demo .ics into the authenticated user storage and schedule' })
  importDefaultSchedule(
    @CurrentUser() currentUser: AuthenticatedUserContext,
    @Body() dto: ImportMyScheduleDto,
  ) {
    return this.meService.importDefaultSchedule(currentUser, dto);
  }

  @Post('schedules/import/file')
  @ApiOperation({ summary: 'Upload the authenticated user .ics file and import it' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        name: {
          type: 'string',
          example: 'Horario semestre 2',
        },
        timezone: {
          type: 'string',
          example: 'America/Bogota',
        },
        sourceUrl: {
          type: 'string',
          example: 'https://registroapps.uniandes.edu.co',
        },
        replaceExisting: {
          type: 'boolean',
          example: true,
        },
      },
      required: ['file'],
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  importScheduleFile(
    @CurrentUser() currentUser: AuthenticatedUserContext,
    @UploadedFile() file: { buffer?: Buffer; originalname?: string } | undefined,
    @Body() dto: ImportMyScheduleDto,
  ) {
    return this.meService.importScheduleFile(currentUser, dto, file);
  }

  @Get('routes/to-class/:classId')
  @ApiOperation({ summary: 'Calculate a route from a graph node to one of the authenticated user classes' })
  calculatePathToClass(
    @CurrentUser() currentUser: AuthenticatedUserContext,
    @Param('classId') classId: string,
    @Query() query: MyClassPathDto,
  ) {
    return this.meService.calculatePathToClass(currentUser, classId, query.from);
  }

  @Get('routes/to-next-class')
  @ApiOperation({ summary: 'Calculate a route from a graph node to the authenticated user next upcoming class' })
  calculatePathToNextClass(
    @CurrentUser() currentUser: AuthenticatedUserContext,
    @Query() query: MyClassPathDto,
  ) {
    return this.meService.calculatePathToNextClass(currentUser, query.from);
  }
}
