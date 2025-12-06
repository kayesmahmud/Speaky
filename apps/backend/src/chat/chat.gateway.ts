import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

interface AuthenticatedSocket extends Socket {
  userId?: number;
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/ws/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private userSockets: Map<number, Set<string>> = new Map();

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.split(' ')[1];

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: this.configService.get('JWT_SECRET'),
      });

      const userId: number = payload.sub;
      client.userId = userId;

      // Track user socket
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(client.id);

      console.log(`User ${userId} connected with socket ${client.id}`);
    } catch (error) {
      console.log('WebSocket auth failed:', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      const userSocketSet = this.userSockets.get(client.userId);
      if (userSocketSet) {
        userSocketSet.delete(client.id);
        if (userSocketSet.size === 0) {
          this.userSockets.delete(client.userId);
        }
      }
      console.log(`User ${client.userId} disconnected`);
    }
  }

  @SubscribeMessage('join_room')
  async handleJoinRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { connectionId: number },
  ) {
    if (!client.userId) return;

    // Verify user has access to this connection
    const connection = await this.prisma.connection.findFirst({
      where: {
        id: data.connectionId,
        OR: [{ userAId: client.userId }, { userBId: client.userId }],
        status: 'accepted',
      },
    });

    if (!connection) {
      client.emit('error', { message: 'Access denied to this chat' });
      return;
    }

    const roomName = `connection_${data.connectionId}`;
    client.join(roomName);
    console.log(`User ${client.userId} joined room ${roomName}`);
  }

  @SubscribeMessage('leave_room')
  handleLeaveRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { connectionId: number },
  ) {
    const roomName = `connection_${data.connectionId}`;
    client.leave(roomName);
    console.log(`User ${client.userId} left room ${roomName}`);
  }

  @SubscribeMessage('send_message')
  async handleMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { connectionId: number; content: string; type?: string },
  ) {
    if (!client.userId) return;

    // Verify access and create message
    const connection = await this.prisma.connection.findFirst({
      where: {
        id: data.connectionId,
        OR: [{ userAId: client.userId }, { userBId: client.userId }],
        status: 'accepted',
      },
    });

    if (!connection) {
      client.emit('error', { message: 'Access denied' });
      return;
    }

    const message = await this.prisma.message.create({
      data: {
        connectionId: data.connectionId,
        senderId: client.userId,
        content: data.content,
        type: (data.type as 'text' | 'image') || 'text',
      },
    });

    const formattedMessage = {
      id: message.id,
      connection_id: message.connectionId,
      sender_id: message.senderId,
      content: message.content,
      type: message.type,
      created_at: message.createdAt.toISOString(),
      is_flagged: message.isFlagged,
    };

    // Broadcast to all users in the room
    const roomName = `connection_${data.connectionId}`;
    this.server.to(roomName).emit('new_message', formattedMessage);
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { connectionId: number; isTyping: boolean },
  ) {
    if (!client.userId) return;

    const roomName = `connection_${data.connectionId}`;
    client.to(roomName).emit('user_typing', {
      userId: client.userId,
      isTyping: data.isTyping,
    });
  }
}
