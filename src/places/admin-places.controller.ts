import {
  Body,
  Controller,
  NotFoundException,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Repository } from 'typeorm';
import { AdminGuard } from '../firebase/admin.guard';
import { FirebaseAuthGuard } from '../firebase/firebase-auth.guard';
import { Place } from './entities/place.entity';

class UpdatePlaceDto {
  name?: string;
  description?: string | null;
  photoUrl?: string | null;
  openingHours?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

// Admin-only place edit (wiki: "Building information update interface (photos, services, hours)").
@ApiTags('admin')
@ApiBearerAuth('firebase')
@UseGuards(FirebaseAuthGuard, AdminGuard)
@Controller('admin/places')
export class AdminPlacesController {
  constructor(
    @InjectRepository(Place)
    private readonly placeRepo: Repository<Place>,
  ) {}

  @Patch(':id')
  @ApiOperation({ summary: 'Update mutable fields on a place (admin)' })
  async update(@Param('id') id: string, @Body() dto: UpdatePlaceDto) {
    const place = await this.placeRepo.findOne({ where: { id } });
    if (!place) throw new NotFoundException(`Place "${id}" not found.`);

    if (dto.name !== undefined) place.name = dto.name;
    if (dto.description !== undefined) (place as any).description = dto.description;
    if (dto.photoUrl !== undefined) place.photoUrl = dto.photoUrl;
    if (dto.openingHours !== undefined) (place as any).openingHours = dto.openingHours;
    if (dto.latitude !== undefined) place.latitude = dto.latitude;
    if (dto.longitude !== undefined) place.longitude = dto.longitude;

    return this.placeRepo.save(place);
  }
}
