import { Controller, Delete, Get, NotFoundException, Param, Post, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Repository } from 'typeorm';
import { CurrentUser } from '../firebase/current-user.decorator';
import { FirebaseAuthGuard } from '../firebase/firebase-auth.guard';
import type { AuthenticatedUserContext } from '../firebase/interfaces/authenticated-user-context.interface';
import { Place } from '../places/entities/place.entity';
import { Favorite } from './entities/favorite.entity';

@ApiTags('favorites')
@ApiBearerAuth('firebase')
@UseGuards(FirebaseAuthGuard)
@Controller('me/favorites')
export class FavoritesController {
  constructor(
    @InjectRepository(Favorite)
    private readonly favRepo: Repository<Favorite>,
    @InjectRepository(Place)
    private readonly placeRepo: Repository<Place>,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List the current user favorites' })
  list(@CurrentUser() ctx: AuthenticatedUserContext) {
    return this.favRepo.find({
      where: { user: { id: ctx.user.id } },
      relations: { place: true },
      order: { createdAt: 'DESC' },
    });
  }

  @Post(':placeId')
  @ApiOperation({ summary: 'Save a place to favorites (idempotent)' })
  async add(@Param('placeId') placeId: string, @CurrentUser() ctx: AuthenticatedUserContext) {
    const place = await this.placeRepo.findOne({ where: { id: placeId } });
    if (!place) throw new NotFoundException('place not found');
    const existing = await this.favRepo.findOne({
      where: { user: { id: ctx.user.id }, place: { id: placeId } },
      relations: { place: true },
    });
    if (existing) return existing; // Idempotent
    const fav = this.favRepo.create({ user: ctx.user, place });
    return this.favRepo.save(fav);
  }

  @Delete(':placeId')
  @ApiOperation({ summary: 'Remove a place from favorites' })
  async remove(@Param('placeId') placeId: string, @CurrentUser() ctx: AuthenticatedUserContext) {
    const fav = await this.favRepo.findOne({
      where: { user: { id: ctx.user.id }, place: { id: placeId } },
    });
    if (!fav) return { ok: true }; // Already gone
    await this.favRepo.remove(fav);
    return { ok: true };
  }
}
