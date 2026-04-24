import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Repository } from 'typeorm';
import { CurrentUser } from '../firebase/current-user.decorator';
import { FirebaseAuthGuard } from '../firebase/firebase-auth.guard';
import type { AuthenticatedUserContext } from '../firebase/interfaces/authenticated-user-context.interface';
import { CrashEvent } from './entities/crash-event.entity';
import { LocationEvent } from './entities/location-event.entity';
import { UsageEvent } from './entities/usage-event.entity';
import { CreateCrashEventDto } from './dto/create-crash-event.dto';
import { CreateLocationEventDto } from './dto/create-location-event.dto';
import { CreateUsageEventDto } from './dto/create-usage-event.dto';

@ApiTags('analytics')
@ApiBearerAuth('firebase')
@UseGuards(FirebaseAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(
    @InjectRepository(UsageEvent)
    private readonly usageRepo: Repository<UsageEvent>,
    @InjectRepository(CrashEvent)
    private readonly crashRepo: Repository<CrashEvent>,
    @InjectRepository(LocationEvent)
    private readonly locationRepo: Repository<LocationEvent>,
  ) {}

  @Post('usage')
  @ApiOperation({ summary: 'Log a usage event (button tap, screen view, etc)' })
  async logUsage(
    @CurrentUser() currentUser: AuthenticatedUserContext,
    @Body() dto: CreateUsageEventDto,
  ) {
    const ev = this.usageRepo.create({
      user: currentUser?.user ?? null,
      eventType: dto.eventType,
      feature: dto.feature ?? null,
      payload: dto.payload ?? null,
      occurredAt: new Date(),
    });
    return this.usageRepo.save(ev);
  }

  @Post('crash')
  @ApiOperation({ summary: 'Log a client-side crash' })
  async logCrash(
    @CurrentUser() currentUser: AuthenticatedUserContext,
    @Body() dto: CreateCrashEventDto,
  ) {
    const ev = this.crashRepo.create({
      user: currentUser?.user ?? null,
      message: dto.message,
      stackTrace: dto.stackTrace ?? null,
      appVersion: dto.appVersion ?? null,
      deviceInfo: dto.deviceInfo ?? null,
      occurredAt: new Date(),
    });
    return this.crashRepo.save(ev);
  }

  @Post('location')
  @ApiOperation({ summary: 'Log a location sample' })
  async logLocation(
    @CurrentUser() currentUser: AuthenticatedUserContext,
    @Body() dto: CreateLocationEventDto,
  ) {
    const ev = this.locationRepo.create({
      user: currentUser?.user ?? null,
      latitude: dto.latitude,
      longitude: dto.longitude,
      accuracyMeters: dto.accuracyMeters ?? null,
      recordedAt: new Date(),
    });
    return this.locationRepo.save(ev);
  }
}
