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
      is_read: message.isRead,
      read_at: message.readAt?.toISOString() || null,
    };
  }

  async getMessages(userId: number, connectionId: number) {
    // Validate access
    await this.connectionsService.validateConnectionAccess(userId, connectionId);

    const messages = await this.prisma.message.findMany({
      where: { connectionId },
      orderBy: { createdAt: 'asc' },
    });

    return messages.map((m) => this.formatMessage(m));
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

  async markMessagesAsRead(userId: number, connectionId: number) {
    // Validate access
    await this.connectionsService.validateConnectionAccess(userId, connectionId);

    // Mark all messages from the other user as read
    const result = await this.prisma.message.updateMany({
      where: {
        connectionId,
        senderId: { not: userId },
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return { marked_read: result.count };
  }

  async getUnreadCount(userId: number, connectionId: number) {
    // Validate access
    await this.connectionsService.validateConnectionAccess(userId, connectionId);

    const count = await this.prisma.message.count({
      where: {
        connectionId,
        senderId: { not: userId },
        isRead: false,
      },
    });

    return { unread_count: count };
  }

  async getTotalUnreadCount(userId: number) {
    // Get all connections for this user
    const connections = await this.prisma.connection.findMany({
      where: {
        OR: [{ userAId: userId }, { userBId: userId }],
        status: 'accepted',
      },
      select: { id: true },
    });

    const connectionIds = connections.map((c) => c.id);

    const count = await this.prisma.message.count({
      where: {
        connectionId: { in: connectionIds },
        senderId: { not: userId },
        isRead: false,
      },
    });

    return { total_unread_count: count };
  }
}
