import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PartnersService {
  // In-memory store for online users (use Redis in production)
  private onlineUsers: Map<number, Date> = new Map();

  constructor(private prisma: PrismaService) {}

  setUserOnline(userId: number) {
    this.onlineUsers.set(userId, new Date());
    this.prisma.user.update({
      where: { id: userId },
      data: { isOnline: true, lastActive: new Date() },
    }).catch(() => {});
  }

  setUserOffline(userId: number) {
    this.onlineUsers.delete(userId);
    this.prisma.user.update({
      where: { id: userId },
      data: { isOnline: false, lastActive: new Date() },
    }).catch(() => {});
  }

  isUserOnline(userId: number): boolean {
    return this.onlineUsers.has(userId);
  }

  async getPartners(currentUserId: number) {
    // Get current user's language preferences
    const currentUser = await this.prisma.user.findUnique({
      where: { id: currentUserId },
      select: { nativeLanguage: true, learningLanguage: true },
    });

    if (!currentUser?.nativeLanguage || !currentUser?.learningLanguage) {
      return [];
    }

    // Find matching partners:
    // Their native = my learning AND Their learning = my native
    const partners = await this.prisma.user.findMany({
      where: {
        id: { not: currentUserId },
        isActive: true,
        nativeLanguage: currentUser.learningLanguage,
        learningLanguage: currentUser.nativeLanguage,
      },
      select: {
        id: true,
        name: true,
        nativeLanguage: true,
        learningLanguage: true,
        bio: true,
        avatarUrl: true,
        isOnline: true,
        lastActive: true,
      },
      orderBy: [
        { isOnline: 'desc' },
        { lastActive: 'desc' },
      ],
      take: 100,
    });

    // Add real-time online status from memory
    return partners.map((partner) => ({
      id: partner.id,
      name: partner.name,
      native_language: partner.nativeLanguage,
      learning_language: partner.learningLanguage,
      bio: partner.bio,
      avatar_url: partner.avatarUrl,
      is_online: this.isUserOnline(partner.id) || partner.isOnline,
      last_active: partner.lastActive?.toISOString() || new Date().toISOString(),
    }));
  }

  async getOrCreateConversation(userId1: number, userId2: number) {
    // Check if connection exists
    let connection = await this.prisma.connection.findFirst({
      where: {
        OR: [
          { userAId: userId1, userBId: userId2 },
          { userAId: userId2, userBId: userId1 },
        ],
      },
    });

    // Auto-create connection if it doesn't exist (direct messaging)
    if (!connection) {
      connection = await this.prisma.connection.create({
        data: {
          userAId: userId1,
          userBId: userId2,
          status: 'accepted', // Auto-accept for direct messaging
        },
      });
    } else if (connection.status !== 'accepted') {
      // Auto-accept pending connections for direct messaging
      connection = await this.prisma.connection.update({
        where: { id: connection.id },
        data: { status: 'accepted' },
      });
    }

    return {
      id: connection.id,
      user_a_id: connection.userAId,
      user_b_id: connection.userBId,
      status: connection.status,
      created_at: connection.createdAt.toISOString(),
    };
  }
}
