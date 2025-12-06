import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DiscoveryService } from './discovery.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { DiscoveryQueryDto } from './dto/discovery.dto';
import { User } from '@prisma/client';

@Controller('discovery')
@UseGuards(JwtAuthGuard)
export class DiscoveryController {
  constructor(private discoveryService: DiscoveryService) {}

  @Get()
  async getDiscoveryFeed(
    @CurrentUser() user: User,
    @Query() query: DiscoveryQueryDto,
  ) {
    return this.discoveryService.getDiscoveryFeed(user.id, query);
  }
}
