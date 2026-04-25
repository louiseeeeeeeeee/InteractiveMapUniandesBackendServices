import { Body, Controller, Delete, Get, NotFoundException, Param, Post, Put } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Repository } from 'typeorm';
import { Place } from '../places/entities/place.entity';
import { CreateAlertDto } from './dto/create-alert.dto';
import { Alert } from './entities/alert.entity';

// Public read, open create for now (admin gating can come later).
@ApiTags('alerts')
@Controller('alerts')
export class AlertsController {
  constructor(
    @InjectRepository(Alert)
    private readonly alertRepo: Repository<Alert>,
    @InjectRepository(Place)
    private readonly placeRepo: Repository<Place>,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all active alerts' })
  list() {
    return this.alertRepo.find({
      where: { active: true },
      order: { createdAt: 'DESC' },
      relations: { place: true },
      take: 100,
    });
  }

  @Post()
  @ApiOperation({ summary: 'Create an alert (admin)' })
  async create(@Body() dto: CreateAlertDto) {
    const place = dto.placeId ? await this.placeRepo.findOne({ where: { id: dto.placeId } }) : null;
    if (dto.placeId && !place) throw new NotFoundException('place not found');
    const a = this.alertRepo.create({
      type: dto.type,
      title: dto.title,
      body: dto.body ?? null,
      icon: dto.icon ?? null,
      active: dto.active ?? true,
      place,
    });
    return this.alertRepo.save(a);
  }

  @Put(':id/deactivate')
  @ApiOperation({ summary: 'Mark an alert as resolved/inactive' })
  async deactivate(@Param('id') id: string) {
    const a = await this.alertRepo.findOne({ where: { id } });
    if (!a) throw new NotFoundException();
    a.active = false;
    return this.alertRepo.save(a);
  }
}
