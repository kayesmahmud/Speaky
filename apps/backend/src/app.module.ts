import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { DiscoveryModule } from './discovery/discovery.module';
import { ConnectionsModule } from './connections/connections.module';
import { MessagesModule } from './messages/messages.module';
import { ChatModule } from './chat/chat.module';
import { CorrectionsModule } from './corrections/corrections.module';
import { TranslationsModule } from './translations/translations.module';
import { UploadsModule } from './uploads/uploads.module';
import { PartnersModule } from './partners/partners.module';
import { FeedModule } from './feed/feed.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    DiscoveryModule,
    ConnectionsModule,
    MessagesModule,
    PartnersModule,
    FeedModule,
    ChatModule,
    CorrectionsModule,
    TranslationsModule,
    UploadsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
