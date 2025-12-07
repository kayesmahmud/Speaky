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

@Controller('corrections')
@UseGuards(JwtAuthGuard)
export class CorrectionsController {
  constructor(private correctionsService: CorrectionsService) {}

  @Post()
  async createCorrection(
    @CurrentUser('id') userId: number,
    @Body() dto: CreateCorrectionDto,
  ) {
    return this.correctionsService.createCorrection(userId, dto);
  }

  @Get('message/:messageId')
  async getCorrectionsForMessage(
    @CurrentUser('id') userId: number,
    @Param('messageId', ParseIntPipe) messageId: number,
  ) {
    return this.correctionsService.getCorrectionsForMessage(userId, messageId);
  }

  @Get('my')
  async getMyCorrections(@CurrentUser('id') userId: number) {
    return this.correctionsService.getMyCorrections(userId);
  }

  @Delete(':id')
  async deleteCorrection(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.correctionsService.deleteCorrection(userId, id);
  }
}
