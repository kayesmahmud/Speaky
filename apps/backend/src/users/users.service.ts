import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/user.dto';
import { User } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  formatUser(user: User) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      native_language: user.nativeLanguage,
      learning_language: user.learningLanguage,
      bio: user.bio,
      avatar_url: user.avatarUrl,
      timezone: user.timezone,
      is_active: user.isActive,
      last_active: user.lastActive.toISOString(),
      created_at: user.createdAt.toISOString(),
    };
  }

  async getMe(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.formatUser(user);
  }

  async updateMe(userId: number, dto: UpdateUserDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.native_language && { nativeLanguage: dto.native_language }),
        ...(dto.learning_language && { learningLanguage: dto.learning_language }),
        ...(dto.bio !== undefined && { bio: dto.bio }),
        ...(dto.avatar_url !== undefined && { avatarUrl: dto.avatar_url }),
        ...(dto.timezone && { timezone: dto.timezone }),
      },
    });

    return this.formatUser(user);
  }

  async findById(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }
}
