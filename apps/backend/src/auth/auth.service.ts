import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, LoginDto, AuthResponseDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        hashedPassword,
        name: dto.name,
        nativeLanguage: dto.native_language,
        learningLanguage: dto.learning_language,
      },
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      native_language: user.nativeLanguage,
      learning_language: user.learningLanguage,
      bio: user.bio,
      avatar_url: user.avatarUrl,
      is_active: user.isActive,
      created_at: user.createdAt.toISOString(),
    };
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.hashedPassword);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: user.id, email: user.email };
    const accessToken = this.jwtService.sign(payload);

    return {
      access_token: accessToken,
      token_type: 'bearer',
    };
  }

  async validateUser(userId: number) {
    return this.prisma.user.findUnique({
      where: { id: userId },
    });
  }
}
