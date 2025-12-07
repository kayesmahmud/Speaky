import {
  Controller,
  Get,
  Post,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PartnersService } from './partners.service';

@Controller('partners')
@UseGuards(JwtAuthGuard)
export class PartnersController {
  constructor(private partnersService: PartnersService) {}

  @Get()
  async getPartners(@CurrentUser('id') userId: number) {
    return this.partnersService.getPartners(userId);
  }

  @Post(':partnerId/conversation')
  async startConversation(
    @CurrentUser('id') userId: number,
    @Param('partnerId', ParseIntPipe) partnerId: number,
  ) {
    return this.partnersService.getOrCreateConversation(userId, partnerId);
  }
}
