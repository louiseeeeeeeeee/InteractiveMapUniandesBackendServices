import {
  Body,
  Controller,
  NotFoundException,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Repository } from 'typeorm';
import { AdminGuard } from '../firebase/admin.guard';
import { FirebaseAuthGuard } from '../firebase/firebase-auth.guard';
import { SetupGuard } from '../setup/setup.guard';
import { User } from './entities/user.entity';

class PromoteUserDto {
  email!: string;
  isAdmin?: boolean;
}

// Bootstrap-friendly: setup-keyed promote (so the very first admin can be created without an existing admin).
// After someone is admin they can use the firebase-authed grant endpoint.
@ApiTags('admin')
@Controller('admin/users')
export class AdminUsersController {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  @Post('promote')
  @UseGuards(SetupGuard)
  @ApiOperation({ summary: 'Promote a user to admin (setup-keyed; bootstrap)' })
  async promote(@Body() dto: PromoteUserDto) {
    return this.toggleAdmin(dto, dto.isAdmin ?? true);
  }

  @Patch('grant-admin')
  @ApiBearerAuth('firebase')
  @UseGuards(FirebaseAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Grant or revoke admin to another user (admin only)' })
  async grant(@Body() dto: PromoteUserDto) {
    return this.toggleAdmin(dto, dto.isAdmin ?? true);
  }

  private async toggleAdmin(dto: PromoteUserDto, isAdmin: boolean) {
    const email = dto.email?.trim().toLowerCase();
    if (!email) throw new NotFoundException('email required');
    const user = await this.userRepo.findOne({ where: { email } });
    if (!user) throw new NotFoundException(`User "${email}" not found.`);
    user.isAdmin = isAdmin;
    return this.userRepo.save(user);
  }
}
