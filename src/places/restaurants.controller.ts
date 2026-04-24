import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Repository } from 'typeorm';
import { CurrentUser } from '../firebase/current-user.decorator';
import { FirebaseAuthGuard } from '../firebase/firebase-auth.guard';
import type { AuthenticatedUserContext } from '../firebase/interfaces/authenticated-user-context.interface';
import { CreateReviewDto } from './dto/create-review.dto';
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
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all restaurants on campus' })
  async list() {
    return this.restaurantRepository.find({ order: { name: 'ASC' } });
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
