import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

@Injectable()
export class UploadsService {
  private uploadDir: string;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.uploadDir = path.join(process.cwd(), 'uploads');
    this.ensureUploadDir();
  }

  private ensureUploadDir() {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
    // Create subdirectories
    const subdirs = ['avatars', 'messages'];
    for (const subdir of subdirs) {
      const dir = path.join(this.uploadDir, subdir);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  private generateFileName(originalName: string): string {
    const ext = path.extname(originalName);
    const hash = crypto.randomBytes(16).toString('hex');
    return `${Date.now()}-${hash}${ext}`;
  }

  async uploadAvatar(userId: number, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.');
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException('File too large. Maximum size is 5MB.');
    }

    const fileName = this.generateFileName(file.originalname);
    const filePath = path.join(this.uploadDir, 'avatars', fileName);

    // Save file
    fs.writeFileSync(filePath, file.buffer);

    // Get base URL from config or use default
    const baseUrl = this.configService.get<string>('BASE_URL') || 'http://localhost:8000';
    const avatarUrl = `${baseUrl}/uploads/avatars/${fileName}`;

    // Update user's avatar
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
    });

    return {
      avatar_url: avatarUrl,
      message: 'Avatar uploaded successfully',
    };
  }

  async uploadMessageImage(userId: number, connectionId: number, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Verify user has access to this connection
    const connection = await this.prisma.connection.findFirst({
      where: {
        id: connectionId,
        OR: [{ userAId: userId }, { userBId: userId }],
        status: 'accepted',
      },
    });

    if (!connection) {
      throw new BadRequestException('Access denied to this connection');
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type');
    }

    // Validate file size (10MB max for message images)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException('File too large. Maximum size is 10MB.');
    }

    const fileName = this.generateFileName(file.originalname);
    const filePath = path.join(this.uploadDir, 'messages', fileName);

    // Save file
    fs.writeFileSync(filePath, file.buffer);

    const baseUrl = this.configService.get<string>('BASE_URL') || 'http://localhost:8000';
    const imageUrl = `${baseUrl}/uploads/messages/${fileName}`;

    return {
      image_url: imageUrl,
      message: 'Image uploaded successfully',
    };
  }

  async deleteAvatar(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (user?.avatarUrl) {
      // Extract filename from URL and delete file
      const fileName = path.basename(user.avatarUrl);
      const filePath = path.join(this.uploadDir, 'avatars', fileName);

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: null },
    });

    return { message: 'Avatar deleted successfully' };
  }
}
