import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { FeedService } from './feed.service';
import { CreatePostDto, CreateCommentDto } from './dto/feed.dto';

@Controller('feed')
@UseGuards(JwtAuthGuard)
export class FeedController {
  constructor(private feedService: FeedService) {}

  @Get()
  async getFeed(
    @CurrentUser('id') userId: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.feedService.getFeed(
      userId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  @Post()
  async createPost(
    @CurrentUser('id') userId: number,
    @Body() dto: CreatePostDto,
  ) {
    return this.feedService.createPost(userId, dto);
  }

  @Get(':id')
  async getPost(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) postId: number,
  ) {
    return this.feedService.getPost(postId, userId);
  }

  @Delete(':id')
  async deletePost(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) postId: number,
  ) {
    return this.feedService.deletePost(postId, userId);
  }

  @Post(':id/like')
  async likePost(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) postId: number,
  ) {
    return this.feedService.likePost(postId, userId);
  }

  @Get(':id/comments')
  async getComments(@Param('id', ParseIntPipe) postId: number) {
    return this.feedService.getComments(postId);
  }

  @Post(':id/comments')
  async addComment(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) postId: number,
    @Body() dto: CreateCommentDto,
  ) {
    return this.feedService.addComment(postId, userId, dto);
  }

  @Delete('comments/:commentId')
  async deleteComment(
    @CurrentUser('id') userId: number,
    @Param('commentId', ParseIntPipe) commentId: number,
  ) {
    return this.feedService.deleteComment(commentId, userId);
  }
}
