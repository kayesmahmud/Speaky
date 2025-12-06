import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConnectionsService } from '../connections/connections.service';
import { CreateMessageDto } from './dto/message.dto';
import { Message } from '@prisma/client';

@Injectable()
export class MessagesService {
  constructor(
    private prisma: PrismaService,
    private connectionsService: ConnectionsService,
  ) {}

  formatMessage(message: Message) {
    return {
      id: message.id,
      connection_id: message.connectionId,
      sender_id: message.senderId,
      content: message.content,
      type: message.type,
      created_at: message.createdAt.toISOString(),
      is_flagged: message.isFlagged,
    };
  }

  async getMessages(userId: number, connectionId: number) {
    // Validate access
    await this.connectionsService.validateConnectionAccess(userId, connectionId);

    const messages = await this.prisma.message.findMany({
      where: { connectionId },
      orderBy: { createdAt: 'asc' },
    });

    return messages.map(this.formatMessage);
  }

  async createMessage(userId: number, connectionId: number, dto: CreateMessageDto) {
    // Validate access
    await this.connectionsService.validateConnectionAccess(userId, connectionId);

    const message = await this.prisma.message.create({
      data: {
        connectionId,
        senderId: userId,
        content: dto.content,
        type: dto.type || 'text',
      },
    });

    return this.formatMessage(message);
  }
}
