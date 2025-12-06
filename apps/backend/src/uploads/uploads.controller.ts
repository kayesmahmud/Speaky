import {
  Controller,
  Post,
  Delete,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseIntPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UploadsService } from './uploads.service';

@Controller('api/uploads')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  constructor(private uploadsService: UploadsService) {}

  @Post('avatar')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(
    @CurrentUser('sub') userId: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.uploadsService.uploadAvatar(userId, file);
  }

  @Delete('avatar')
  async deleteAvatar(@CurrentUser('sub') userId: number) {
    return this.uploadsService.deleteAvatar(userId);
  }

  @Post('message/:connectionId')
  @UseInterceptors(FileInterceptor('file'))
  async uploadMessageImage(
    @CurrentUser('sub') userId: number,
    @Param('connectionId', ParseIntPipe) connectionId: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.uploadsService.uploadMessageImage(userId, connectionId, file);
  }
}
