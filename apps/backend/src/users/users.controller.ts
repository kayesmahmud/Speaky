import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UpdateUserDto } from './dto/user.dto';
import { User } from '@prisma/client';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  async getMe(@CurrentUser() user: User) {
    return this.usersService.getMe(user.id);
  }

  @Patch('me')
  async updateMe(@CurrentUser() user: User, @Body() dto: UpdateUserDto) {
    return this.usersService.updateMe(user.id, dto);
  }
}
