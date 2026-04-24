import { BadRequestException, Injectable } from '@nestjs/common';
import { FirebaseStorageService } from '../firebase/firebase-storage.service';
import { AuthenticatedUserContext } from '../firebase/interfaces/authenticated-user-context.interface';
import { CalculateClassPathDto } from '../routes/dto/calculate-class-path.dto';
import { RoutesService } from '../routes/routes.service';
import { ImportScheduleDto } from '../schedules/dto/import-schedule.dto';
import { SchedulesService } from '../schedules/schedules.service';
import { ScheduleSourceType } from '../common/enums/schedule-source-type.enum';
import { UsersService } from '../users/users.service';
import { ImportMyScheduleDto } from './dto/import-my-schedule.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class MeService {
  constructor(
    private readonly usersService: UsersService,
    private readonly schedulesService: SchedulesService,
    private readonly routesService: RoutesService,
    private readonly firebaseStorageService: FirebaseStorageService,
  ) {}

  async getMe(currentUser: AuthenticatedUserContext) {
    const overview = await this.usersService.getCurrentUserOverview(
      currentUser.user.id,
    );

    return {
      ...overview,
      firebase: {
        uid: currentUser.firebaseUser.uid,
        signInProvider:
          currentUser.firebaseUser.firebase?.sign_in_provider ?? null,
        emailVerified: currentUser.firebaseUser.email_verified ?? false,
      },
    };
  }

  async updateProfile(currentUser: AuthenticatedUserContext, dto: UpdateProfileDto) {
    return this.usersService.updateProfile(currentUser.user.id, dto);
  }

  async updatePreferences(currentUser: AuthenticatedUserContext, dto: UpdatePreferencesDto) {
    return this.usersService.updatePreferences(currentUser.user.id, dto);
  }

  async listSchedules(currentUser: AuthenticatedUserContext) {
    return this.schedulesService.listSchedulesForUser(currentUser.user.id);
  }

  async getCurrentSchedule(currentUser: AuthenticatedUserContext) {
    return this.schedulesService.getLatestScheduleForUser(currentUser.user.id);
  }

  async listCurrentScheduleClasses(currentUser: AuthenticatedUserContext) {
    return this.schedulesService.listCurrentScheduleClassesForUser(
      currentUser.user.id,
    );
  }

  async getNextClass(currentUser: AuthenticatedUserContext) {
    const nextClass = await this.schedulesService.getNextClassForUser(
      currentUser.user.id,
    );

    return {
      hasUpcomingClass: Boolean(nextClass),
      class: nextClass,
    };
  }

  async listTodayClasses(currentUser: AuthenticatedUserContext) {
    return this.schedulesService.listTodayClassesForUser(currentUser.user.id);
  }

  async importScheduleFile(
    currentUser: AuthenticatedUserContext,
    dto: ImportMyScheduleDto,
    file: { buffer?: Buffer; originalname?: string } | undefined,
  ) {
    if (!file?.buffer?.length || !file.originalname?.trim()) {
      throw new BadRequestException('Upload a valid .ics file.');
    }

    const storedFile = await this.firebaseStorageService.saveUserIcsFile({
      firebaseUid: this.resolveFirebaseUid(currentUser),
      fileName: file.originalname,
      fileBuffer: file.buffer,
    });

    return this.schedulesService.importScheduleForUser(
      currentUser.user,
      this.mapImportDto(dto),
      {
        fileBuffer: file.buffer,
        fileName: file.originalname,
        sourceType: ScheduleSourceType.ICS_UPLOAD,
        sourceUrl: dto.sourceUrl?.trim() || null,
        sourceFileName: storedFile.fileName,
        sourceStoragePath: storedFile.storagePath,
        sourceStorageProvider: storedFile.storageProvider,
        sourceStorageBucket: storedFile.storageBucket ?? null,
        isDefaultSample: false,
      },
    );
  }

  async importDefaultSchedule(
    currentUser: AuthenticatedUserContext,
    dto: ImportMyScheduleDto,
  ) {
    const defaultContent = await this.schedulesService.getDefaultIcsFileContent();
    const defaultFileName = 'PRIMER SEMESTRE 2026.ics';
    const fileBuffer = Buffer.from(defaultContent, 'utf8');
    const storedFile = await this.firebaseStorageService.saveUserIcsFile({
      firebaseUid: this.resolveFirebaseUid(currentUser),
      fileName: defaultFileName,
      fileBuffer,
    });

    return this.schedulesService.importScheduleForUser(
      currentUser.user,
      this.mapImportDto(dto),
      {
        icsContent: defaultContent,
        fileName: defaultFileName,
        sourceType: ScheduleSourceType.DEFAULT_SAMPLE,
        sourceFileName: storedFile.fileName,
        sourceStoragePath: storedFile.storagePath,
        sourceStorageProvider: storedFile.storageProvider,
        sourceStorageBucket: storedFile.storageBucket ?? null,
        isDefaultSample: true,
      },
    );
  }

  async calculatePathToClass(
    currentUser: AuthenticatedUserContext,
    classId: string,
    from: string,
  ) {
    return this.routesService.calculatePathToUserClass(currentUser.user.id, {
      classId,
      from,
    } as CalculateClassPathDto);
  }

  async calculatePathToNextClass(
    currentUser: AuthenticatedUserContext,
    from: string,
  ) {
    const nextClass = await this.schedulesService.getNextClassForUser(
      currentUser.user.id,
    );

    if (!nextClass) {
      return {
        hasUpcomingClass: false,
        class: null,
        path: null,
      };
    }

    const path = await this.routesService.calculatePathToUserClass(
      currentUser.user.id,
      {
        classId: nextClass.id,
        from,
      } as CalculateClassPathDto,
    );

    return {
      hasUpcomingClass: true,
      class: nextClass,
      path,
    };
  }

  private mapImportDto(dto: ImportMyScheduleDto): ImportScheduleDto {
    return {
      name: dto.name,
      timezone: dto.timezone,
      sourceUrl: dto.sourceUrl,
      replaceExisting: dto.replaceExisting,
    };
  }

  private resolveFirebaseUid(currentUser: AuthenticatedUserContext) {
    const firebaseUid = currentUser.user.firebaseUid ?? currentUser.firebaseUser.uid;

    if (!firebaseUid) {
      throw new BadRequestException(
        'The current user does not have a Firebase uid yet.',
      );
    }

    return firebaseUid;
  }
}
