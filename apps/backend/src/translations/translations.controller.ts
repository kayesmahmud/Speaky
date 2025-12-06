import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TranslationsService } from './translations.service';
import { TranslateMessageDto, TranslateTextDto } from './dto/translation.dto';

@Controller('api/translations')
@UseGuards(JwtAuthGuard)
export class TranslationsController {
  constructor(private translationsService: TranslationsService) {}

  @Post('message')
  async translateMessage(
    @CurrentUser('sub') userId: number,
    @Body() dto: TranslateMessageDto,
  ) {
    return this.translationsService.translateMessage(userId, dto);
  }

  @Post('text')
  async translateText(@Body() dto: TranslateTextDto) {
    return this.translationsService.translateText(dto);
  }

  @Get('languages')
  async getSupportedLanguages() {
    return this.translationsService.getSupportedLanguages();
  }
}
