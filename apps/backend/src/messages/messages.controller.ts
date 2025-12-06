import { Controller, Get, Post, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateMessageDto } from './dto/message.dto';

@Controller('api')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private messagesService: MessagesService) {}

  @Get('connections/:connectionId/messages')
  async getMessages(
    @CurrentUser('sub') userId: number,
    @Param('connectionId', ParseIntPipe) connectionId: number,
  ) {
    return this.messagesService.getMessages(userId, connectionId);
  }

  @Post('connections/:connectionId/messages')
  async createMessage(
    @CurrentUser('sub') userId: number,
    @Param('connectionId', ParseIntPipe) connectionId: number,
    @Body() dto: CreateMessageDto,
  ) {
    return this.messagesService.createMessage(userId, connectionId, dto);
  }

  @Post('connections/:connectionId/messages/read')
  async markMessagesAsRead(
    @CurrentUser('sub') userId: number,
    @Param('connectionId', ParseIntPipe) connectionId: number,
  ) {
    return this.messagesService.markMessagesAsRead(userId, connectionId);
  }

  @Get('connections/:connectionId/messages/unread')
  async getUnreadCount(
    @CurrentUser('sub') userId: number,
    @Param('connectionId', ParseIntPipe) connectionId: number,
  ) {
    return this.messagesService.getUnreadCount(userId, connectionId);
  }

  @Get('messages/unread')
  async getTotalUnreadCount(@CurrentUser('sub') userId: number) {
    return this.messagesService.getTotalUnreadCount(userId);
  }
}
