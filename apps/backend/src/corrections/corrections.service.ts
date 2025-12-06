import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCorrectionDto } from './dto/correction.dto';
import { Correction } from '@prisma/client';

@Injectable()
export class CorrectionsService {
  constructor(private prisma: PrismaService) {}

  formatCorrection(correction: Correction & { corrector?: { id: number; name: string } }) {
    return {
      id: correction.id,
      message_id: correction.messageId,
      corrector_id: correction.correctorId,
      original_text: correction.originalText,
      corrected_text: correction.correctedText,
      explanation: correction.explanation,
      created_at: correction.createdAt.toISOString(),
      corrector: correction.corrector ? {
        id: correction.corrector.id,
        name: correction.corrector.name,
      } : undefined,
    };
  }

  async createCorrection(userId: number, dto: CreateCorrectionDto) {
    // Get the message and verify access
    const message = await this.prisma.message.findUnique({
      where: { id: dto.message_id },
      include: {
        connection: true,
      },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Verify user is part of this connection
    const connection = message.connection;
    if (connection.userAId !== userId && connection.userBId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    // User cannot correct their own message
    if (message.senderId === userId) {
      throw new ForbiddenException('You cannot correct your own message');
    }

    // Create correction
    const correction = await this.prisma.correction.create({
      data: {
        messageId: dto.message_id,
        correctorId: userId,
        originalText: message.content,
        correctedText: dto.corrected_text,
        explanation: dto.explanation,
      },
      include: {
        corrector: {
          select: { id: true, name: true },
        },
      },
    });

    return this.formatCorrection(correction);
  }

  async getCorrectionsForMessage(userId: number, messageId: number) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: { connection: true },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Verify access
    const connection = message.connection;
    if (connection.userAId !== userId && connection.userBId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    const corrections = await this.prisma.correction.findMany({
      where: { messageId },
      include: {
        corrector: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return corrections.map((c) => this.formatCorrection(c));
  }

  async getMyCorrections(userId: number) {
    // Get corrections made to my messages
    const corrections = await this.prisma.correction.findMany({
      where: {
        message: {
          senderId: userId,
        },
      },
      include: {
        corrector: {
          select: { id: true, name: true },
        },
        message: {
          select: { id: true, content: true, connectionId: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return corrections.map((c) => ({
      ...this.formatCorrection(c),
      message: {
        id: c.message.id,
        content: c.message.content,
        connection_id: c.message.connectionId,
      },
    }));
  }

  async deleteCorrection(userId: number, correctionId: number) {
    const correction = await this.prisma.correction.findUnique({
      where: { id: correctionId },
    });

    if (!correction) {
      throw new NotFoundException('Correction not found');
    }

    if (correction.correctorId !== userId) {
      throw new ForbiddenException('You can only delete your own corrections');
    }

    await this.prisma.correction.delete({
      where: { id: correctionId },
    });

    return { success: true };
  }
}
