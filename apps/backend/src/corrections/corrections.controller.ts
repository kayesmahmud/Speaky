import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CorrectionsService } from './corrections.service';
import { CreateCorrectionDto } from './dto/correction.dto';

@Controller('api/corrections')
@UseGuards(JwtAuthGuard)
export class CorrectionsController {
  constructor(private correctionsService: CorrectionsService) {}

  @Post()
  async createCorrection(
    @CurrentUser('sub') userId: number,
    @Body() dto: CreateCorrectionDto,
  ) {
    return this.correctionsService.createCorrection(userId, dto);
  }

  @Get('message/:messageId')
  async getCorrectionsForMessage(
    @CurrentUser('sub') userId: number,
    @Param('messageId', ParseIntPipe) messageId: number,
  ) {
    return this.correctionsService.getCorrectionsForMessage(userId, messageId);
  }

  @Get('my')
  async getMyCorrections(@CurrentUser('sub') userId: number) {
    return this.correctionsService.getMyCorrections(userId);
  }

  @Delete(':id')
  async deleteCorrection(
    @CurrentUser('sub') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.correctionsService.deleteCorrection(userId, id);
  }
}
