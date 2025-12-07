import { Injectable, ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateConnectionDto, UpdateConnectionDto } from './dto/connection.dto';

@Injectable()
export class ConnectionsService {
  constructor(private prisma: PrismaService) {}

  async createConnection(userId: number, dto: CreateConnectionDto) {
    // Check if connection already exists
    const existing = await this.prisma.connection.findFirst({
      where: {
        OR: [
          { userAId: userId, userBId: dto.user_id },
          { userAId: dto.user_id, userBId: userId },
        ],
      },
    });

    if (existing) {
      throw new ConflictException('Connection already exists');
    }

    const connection = await this.prisma.connection.create({
      data: {
        userAId: userId,
        userBId: dto.user_id,
        status: 'pending',
      },
      include: {
        userB: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            nativeLanguage: true,
            learningLanguage: true,
          },
        },
      },
    });

    return {
      id: connection.id,
      user_a: connection.userAId,
      user_b: connection.userBId,
      status: connection.status,
      created_at: connection.createdAt.toISOString(),
      partner: {
        id: connection.userB.id,
        name: connection.userB.name,
        avatar_url: connection.userB.avatarUrl,
        native_language: connection.userB.nativeLanguage,
        learning_language: connection.userB.learningLanguage,
      },
    };
  }

  async getConnections(userId: number) {
    const connections = await this.prisma.connection.findMany({
      where: {
        OR: [{ userAId: userId }, { userBId: userId }],
        status: { not: 'blocked' },
      },
      include: {
        userA: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            nativeLanguage: true,
            learningLanguage: true,
            isOnline: true,
          },
        },
        userB: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            nativeLanguage: true,
            learningLanguage: true,
            isOnline: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            content: true,
            senderId: true,
            createdAt: true,
            isRead: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get unread counts for each connection
    const unreadCounts = await Promise.all(
      connections.map(async (conn) => {
        const count = await this.prisma.message.count({
          where: {
            connectionId: conn.id,
            senderId: { not: userId },
            isRead: false,
          },
        });
        return { connectionId: conn.id, count };
      })
    );

    const unreadMap = new Map(unreadCounts.map((u) => [u.connectionId, u.count]));

    // Sort by last message time (most recent first)
    const sortedConnections = connections.sort((a, b) => {
      const aLastMsg = a.messages[0]?.createdAt;
      const bLastMsg = b.messages[0]?.createdAt;
      if (!aLastMsg && !bLastMsg) return 0;
      if (!aLastMsg) return 1;
      if (!bLastMsg) return -1;
      return bLastMsg.getTime() - aLastMsg.getTime();
    });

    return sortedConnections.map((conn) => {
      const partner = conn.userAId === userId ? conn.userB : conn.userA;
      const lastMessage = conn.messages[0];
      return {
        id: conn.id,
        user_a: conn.userAId,
        user_b: conn.userBId,
        status: conn.status,
        created_at: conn.createdAt.toISOString(),
        partner: {
          id: partner.id,
          name: partner.name,
          avatar_url: partner.avatarUrl,
          native_language: partner.nativeLanguage,
          learning_language: partner.learningLanguage,
          is_online: partner.isOnline,
        },
        last_message: lastMessage
          ? {
              id: lastMessage.id,
              content: lastMessage.content,
              sender_id: lastMessage.senderId,
              created_at: lastMessage.createdAt.toISOString(),
              is_read: lastMessage.isRead,
            }
          : null,
        unread_count: unreadMap.get(conn.id) || 0,
      };
    });
  }

  async updateConnection(userId: number, connectionId: number, dto: UpdateConnectionDto) {
    const connection = await this.prisma.connection.findUnique({
      where: { id: connectionId },
    });

    if (!connection) {
      throw new NotFoundException('Connection not found');
    }

    // Only the receiver (userB) can accept/block
    if (connection.userBId !== userId && dto.status === 'accepted') {
      throw new ForbiddenException('Only the receiver can accept a connection');
    }

    // Either party can block
    if (connection.userAId !== userId && connection.userBId !== userId) {
      throw new ForbiddenException('Not authorized to update this connection');
    }

    const updated = await this.prisma.connection.update({
      where: { id: connectionId },
      data: { status: dto.status },
      include: {
        userA: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            nativeLanguage: true,
            learningLanguage: true,
          },
        },
        userB: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            nativeLanguage: true,
            learningLanguage: true,
          },
        },
      },
    });

    const partner = updated.userAId === userId ? updated.userB : updated.userA;
    return {
      id: updated.id,
      user_a: updated.userAId,
      user_b: updated.userBId,
      status: updated.status,
      created_at: updated.createdAt.toISOString(),
      partner: {
        id: partner.id,
        name: partner.name,
        avatar_url: partner.avatarUrl,
        native_language: partner.nativeLanguage,
        learning_language: partner.learningLanguage,
      },
    };
  }

  async validateConnectionAccess(userId: number, connectionId: number) {
    const connection = await this.prisma.connection.findUnique({
      where: { id: connectionId },
    });

    if (!connection) {
      throw new NotFoundException('Connection not found');
    }

    if (connection.userAId !== userId && connection.userBId !== userId) {
      throw new ForbiddenException('Not authorized to access this connection');
    }

    if (connection.status !== 'accepted') {
      throw new ForbiddenException('Connection is not accepted');
    }

    return connection;
  }
}
