import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Repository } from 'typeorm';
import { CurrentUser } from '../firebase/current-user.decorator';
import { FirebaseAuthGuard } from '../firebase/firebase-auth.guard';
import type { AuthenticatedUserContext } from '../firebase/interfaces/authenticated-user-context.interface';
import { CreateReviewDto } from './dto/create-review.dto';
import { Building } from './entities/building.entity';
import { Restaurant } from './entities/restaurant.entity';
import { Review } from './entities/review.entity';

@ApiTags('restaurants')
@Controller('restaurants')
export class RestaurantsController {
  constructor(
    @InjectRepository(Restaurant)
    private readonly restaurantRepository: Repository<Restaurant>,
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
    @InjectRepository(Building)
    private readonly buildingRepository: Repository<Building>,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List restaurants, optionally filtered/sorted (BQ #4)' })
  @ApiQuery({ name: 'nearBuildingId', required: false, description: 'Sort closest to this building' })
  @ApiQuery({ name: 'minRating', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false, description: 'rating | name' })
  async list(
    @Query('nearBuildingId') nearBuildingId?: string,
    @Query('minRating') minRatingRaw?: string,
    @Query('sortBy') sortBy?: 'rating' | 'name',
  ) {
    let restaurants = await this.restaurantRepository.find();

    const minRating = minRatingRaw ? Number(minRatingRaw) : undefined;
    if (minRating != null && Number.isFinite(minRating)) {
      restaurants = restaurants.filter((r) => (r.averageRating ?? 0) >= minRating);
    }

    if (nearBuildingId) {
      const b = await this.buildingRepository.findOne({ where: { id: nearBuildingId } });
      if (!b || b.latitude == null || b.longitude == null) {
        // Building unknown / no coords → just return current list
        return sortRestaurants(restaurants, sortBy ?? 'name');
      }
      const bLat = Number(b.latitude);
      const bLng = Number(b.longitude);
      restaurants = restaurants
        .map((r) => ({
          r,
          d: r.latitude != null && r.longitude != null
            ? haversineMeters(bLat, bLng, Number(r.latitude), Number(r.longitude))
            : Number.POSITIVE_INFINITY,
        }))
        .sort((a, b) => a.d - b.d) // Closest first
        .map((x) => x.r);
      return restaurants;
    }

    return sortRestaurants(restaurants, sortBy ?? 'name');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one restaurant by id' })
  async getOne(@Param('id') id: string) {
    const restaurant = await this.restaurantRepository.findOne({ where: { id } });
    if (!restaurant) throw new NotFoundException(`Restaurant "${id}" not found.`);
    return restaurant;
  }

  @Get(':id/reviews')
  @ApiOperation({ summary: 'List reviews for a restaurant' })
  async listReviews(@Param('id') id: string) {
    return this.reviewRepository.find({
      where: { restaurant: { id } },
      relations: { user: true },
      order: { createdAt: 'DESC' },
    });
  }

  @Post(':id/reviews')
  @ApiBearerAuth('firebase')
  @UseGuards(FirebaseAuthGuard)
  @ApiOperation({ summary: 'Post or update a review for a restaurant' })
  async createReview(
    @CurrentUser() currentUser: AuthenticatedUserContext,
    @Param('id') id: string,
    @Body() dto: CreateReviewDto,
  ) {
    const restaurant = await this.restaurantRepository.findOne({ where: { id } });
    if (!restaurant) throw new NotFoundException(`Restaurant "${id}" not found.`);
    if (!currentUser?.user) throw new BadRequestException('User context missing.');

    // Upsert: one review per user per restaurant (unique constraint)
    const existing = await this.reviewRepository.findOne({
      where: { user: { id: currentUser.user.id }, restaurant: { id } },
    });

    if (existing) {
      existing.rating = dto.rating;
      existing.comment = dto.comment ?? null;
      const saved = await this.reviewRepository.save(existing);
      await this.recomputeAverage(id);
      return saved;
    }

    const created = this.reviewRepository.create({
      rating: dto.rating,
      comment: dto.comment ?? null,
      user: currentUser.user,
      restaurant,
    });
    const saved = await this.reviewRepository.save(created);
    await this.recomputeAverage(id);
    return saved;
  }

  private async recomputeAverage(restaurantId: string) {
    const reviews = await this.reviewRepository.find({
      where: { restaurant: { id: restaurantId } },
    });
    if (!reviews.length) return;
    const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length; // Recalc avg
    await this.restaurantRepository.update(restaurantId, {
      averageRating: Number(avg.toFixed(2)),
    });
  }
}

function sortRestaurants(rs: Restaurant[], by: 'rating' | 'name'): Restaurant[] {
  if (by === 'rating') return [...rs].sort((a, b) => (b.averageRating ?? 0) - (a.averageRating ?? 0));
  return [...rs].sort((a, b) => a.name.localeCompare(b.name));
}

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
