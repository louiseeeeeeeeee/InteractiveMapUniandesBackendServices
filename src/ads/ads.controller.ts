import { Body, Controller, Get, NotFoundException, Param, Post, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { LessThanOrEqual, MoreThanOrEqual, Or, Repository, IsNull } from 'typeorm';
import { AdminGuard } from '../firebase/admin.guard';
import { CurrentUser } from '../firebase/current-user.decorator';
import { FirebaseAuthGuard } from '../firebase/firebase-auth.guard';
import type { AuthenticatedUserContext } from '../firebase/interfaces/authenticated-user-context.interface';
import { Ad } from './entities/ad.entity';
import { AdClick } from './entities/ad-click.entity';

class CreateAdDto {
  title: string;
  imageUrl?: string;
  targetUrl?: string;
}

@ApiTags('ads')
@Controller('ads')
export class AdsController {
  constructor(
    @InjectRepository(Ad) private readonly adRepo: Repository<Ad>,
    @InjectRepository(AdClick) private readonly clickRepo: Repository<AdClick>,
  ) {}

  @Get('active')
  @ApiOperation({ summary: 'List currently active ads' })
  async listActive() {
    const now = new Date();
    const all = await this.adRepo.find({
      where: { isActive: true },
      order: { createdAt: 'DESC' },
      take: 50,
    });
    // Filter on dates in JS to avoid composing complex TypeORM where (cleaner).
    return all.filter((a) => {
      if (a.startsAt && a.startsAt > now) return false;
      if (a.endsAt && a.endsAt < now) return false;
      return true;
    });
  }

  @Post()
  @ApiBearerAuth('firebase')
  @UseGuards(FirebaseAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Create an ad (admin only)' })
  async create(@Body() dto: CreateAdDto) {
    const ad = this.adRepo.create({
      title: dto.title,
      imageUrl: dto.imageUrl ?? null,
      targetUrl: dto.targetUrl ?? null,
      isActive: true,
    });
    return this.adRepo.save(ad);
  }

  @Post(':id/click')
  @ApiBearerAuth('firebase')
  @UseGuards(FirebaseAuthGuard)
  @ApiOperation({ summary: 'Record a click on an ad' })
  async click(@Param('id') id: string, @CurrentUser() ctx: AuthenticatedUserContext) {
    const ad = await this.adRepo.findOne({ where: { id } });
    if (!ad) throw new NotFoundException();
    const click = this.clickRepo.create({
      ad,
      user: ctx?.user ?? null,
      clickedAt: new Date(),
    });
    return this.clickRepo.save(click);
  }
}
