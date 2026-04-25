import { Body, Controller, Get, NotFoundException, Param, Post, Put, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { In, IsNull, Repository } from 'typeorm';
import { CurrentUser } from '../firebase/current-user.decorator';
import { FirebaseAuthGuard } from '../firebase/firebase-auth.guard';
import type { AuthenticatedUserContext } from '../firebase/interfaces/authenticated-user-context.interface';
import { User } from '../users/entities/user.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { Notification } from './entities/notification.entity';

@ApiTags('notifications')
@ApiBearerAuth('firebase')
@UseGuards(FirebaseAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(
    @InjectRepository(Notification)
    private readonly notifRepo: Repository<Notification>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List notifications for the current user (own + broadcast)' })
  async list(@CurrentUser() ctx: AuthenticatedUserContext) {
    return this.notifRepo.find({
      where: [{ user: { id: ctx.user.id } }, { user: IsNull() }], // Personal + broadcast
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  @Post()
  @ApiOperation({ summary: 'Create a notification (admin/dev usage)' })
  async create(@Body() dto: CreateNotificationDto) {
    const user = dto.userId ? await this.userRepo.findOne({ where: { id: dto.userId } }) : null;
    if (dto.userId && !user) throw new NotFoundException('user not found');
    const n = this.notifRepo.create({
      user,
      type: dto.type,
      title: dto.title,
      body: dto.body ?? null,
      icon: dto.icon ?? null,
      read: false,
    });
    return this.notifRepo.save(n);
  }

  @Put(':id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  async markRead(@Param('id') id: string, @CurrentUser() ctx: AuthenticatedUserContext) {
    const n = await this.notifRepo.findOne({ where: { id }, relations: { user: true } });
    if (!n) throw new NotFoundException();
    if (n.user && n.user.id !== ctx.user.id) throw new NotFoundException(); // Don't leak existence
    n.read = true;
    return this.notifRepo.save(n);
  }
}
