import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePostDto, CreateCommentDto } from './dto/feed.dto';

@Injectable()
export class FeedService {
  constructor(private prisma: PrismaService) {}

  private formatPost(post: any, currentUserId?: number) {
    const isLiked = post.likes?.some((like: any) => like.userId === currentUserId) || false;

    return {
      id: post.id,
      content: post.content,
      image_url: post.imageUrl,
      language: post.language,
      created_at: post.createdAt.toISOString(),
      author: {
        id: post.author.id,
        name: post.author.name,
        avatar_url: post.author.avatarUrl,
        native_language: post.author.nativeLanguage,
        learning_language: post.author.learningLanguage,
      },
      likes_count: post._count?.likes || post.likes?.length || 0,
      comments_count: post._count?.comments || post.comments?.length || 0,
      is_liked: isLiked,
    };
  }

  async getFeed(userId: number, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const posts = await this.prisma.post.findMany({
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            nativeLanguage: true,
            learningLanguage: true,
          },
        },
        likes: {
          where: { userId },
          select: { userId: true },
        },
        _count: {
          select: { likes: true, comments: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    return posts.map((post) => this.formatPost(post, userId));
  }

  async createPost(userId: number, dto: CreatePostDto) {
    const post = await this.prisma.post.create({
      data: {
        authorId: userId,
        content: dto.content,
        imageUrl: dto.image_url,
        language: dto.language,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            nativeLanguage: true,
            learningLanguage: true,
          },
        },
        _count: {
          select: { likes: true, comments: true },
        },
      },
    });

    return this.formatPost(post, userId);
  }

  async getPost(postId: number, userId: number) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            nativeLanguage: true,
            learningLanguage: true,
          },
        },
        likes: {
          where: { userId },
          select: { userId: true },
        },
        _count: {
          select: { likes: true, comments: true },
        },
      },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    return this.formatPost(post, userId);
  }

  async deletePost(postId: number, userId: number) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.authorId !== userId) {
      throw new ForbiddenException('You can only delete your own posts');
    }

    await this.prisma.post.delete({ where: { id: postId } });

    return { success: true };
  }

  async likePost(postId: number, userId: number) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Check if already liked
    const existingLike = await this.prisma.postLike.findUnique({
      where: { postId_userId: { postId, userId } },
    });

    if (existingLike) {
      // Unlike
      await this.prisma.postLike.delete({
        where: { postId_userId: { postId, userId } },
      });
      return { liked: false };
    }

    // Like
    await this.prisma.postLike.create({
      data: { postId, userId },
    });

    return { liked: true };
  }

  async getComments(postId: number) {
    const comments = await this.prisma.postComment.findMany({
      where: { postId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return comments.map((comment) => ({
      id: comment.id,
      content: comment.content,
      created_at: comment.createdAt.toISOString(),
      user: {
        id: comment.user.id,
        name: comment.user.name,
        avatar_url: comment.user.avatarUrl,
      },
    }));
  }

  async addComment(postId: number, userId: number, dto: CreateCommentDto) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const comment = await this.prisma.postComment.create({
      data: {
        postId,
        userId,
        content: dto.content,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });

    return {
      id: comment.id,
      content: comment.content,
      created_at: comment.createdAt.toISOString(),
      user: {
        id: comment.user.id,
        name: comment.user.name,
        avatar_url: comment.user.avatarUrl,
      },
    };
  }

  async deleteComment(commentId: number, userId: number) {
    const comment = await this.prisma.postComment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.userId !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    await this.prisma.postComment.delete({ where: { id: commentId } });

    return { success: true };
  }
}
