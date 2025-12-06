import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { DiscoveryModule } from './discovery/discovery.module';
import { ConnectionsModule } from './connections/connections.module';
import { MessagesModule } from './messages/messages.module';
import { ChatModule } from './chat/chat.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    DiscoveryModule,
    ConnectionsModule,
    MessagesModule,
    ChatModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
