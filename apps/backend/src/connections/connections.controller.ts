import { Controller, Get, Post, Patch, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ConnectionsService } from './connections.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateConnectionDto, UpdateConnectionDto } from './dto/connection.dto';
import { User } from '@prisma/client';

@Controller('connections')
@UseGuards(JwtAuthGuard)
export class ConnectionsController {
  constructor(private connectionsService: ConnectionsService) {}

  @Post()
  async createConnection(
    @CurrentUser() user: User,
    @Body() dto: CreateConnectionDto,
  ) {
    return this.connectionsService.createConnection(user.id, dto);
  }

  @Get()
  async getConnections(@CurrentUser() user: User) {
    return this.connectionsService.getConnections(user.id);
  }

  @Patch(':id')
  async updateConnection(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateConnectionDto,
  ) {
    return this.connectionsService.updateConnection(user.id, id, dto);
  }
}
