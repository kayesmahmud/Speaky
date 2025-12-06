import { Controller, Get, Post, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateMessageDto } from './dto/message.dto';
import { User } from '@prisma/client';

@Controller('connections/:connectionId/messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private messagesService: MessagesService) {}

  @Get()
  async getMessages(
    @CurrentUser() user: User,
    @Param('connectionId', ParseIntPipe) connectionId: number,
  ) {
    return this.messagesService.getMessages(user.id, connectionId);
  }

  @Post()
  async createMessage(
    @CurrentUser() user: User,
    @Param('connectionId', ParseIntPipe) connectionId: number,
    @Body() dto: CreateMessageDto,
  ) {
    return this.messagesService.createMessage(user.id, connectionId, dto);
  }
}
