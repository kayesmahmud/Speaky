import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DiscoveryQueryDto } from './dto/discovery.dto';

@Injectable()
export class DiscoveryService {
  constructor(private prisma: PrismaService) {}

  async getDiscoveryFeed(currentUserId: number, query: DiscoveryQueryDto) {
    const users = await this.prisma.user.findMany({
      where: {
        id: { not: currentUserId },
        isActive: true,
        ...(query.language && {
          OR: [
            { nativeLanguage: query.language },
            { learningLanguage: query.language },
          ],
        }),
      },
      select: {
        id: true,
        name: true,
        nativeLanguage: true,
        learningLanguage: true,
        bio: true,
        avatarUrl: true,
      },
      take: 50,
      orderBy: { lastActive: 'desc' },
    });

    return users.map((user) => ({
      id: user.id,
      name: user.name,
      native_language: user.nativeLanguage,
      learning_language: user.learningLanguage,
      bio: user.bio,
      avatar_url: user.avatarUrl,
    }));
  }
}
