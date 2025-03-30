import { Module } from '@nestjs/common';
import { ChatbotModule } from './chatbot/chatbot.module';
import { WhatsAppModule } from './whatsapp/whatsapp.module';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResponseModule } from './response/response.module';
import { HistoryModule } from './history/history.module';
import { ChatbotController } from './chatbot/chatbot.controller';
import { ChatbotService } from './chatbot/chatbot.service';
import { HistoryService } from './history/history.service';
import { ResponseService } from './response/response.service';
import { ResponseController } from './response/response.controller';
import { HistoryController } from './history/history.controller';
import { Response } from './response/response.entity';
import { ChatHistory } from './history/history.entity';
import { SupportService } from './support/support.service';
import { ScheduleModule } from '@nestjs/schedule';
import { SchedulerService } from './scheduler/scheduler.service';
import { User } from './user/user.entity';
import { UserModule } from './user/user.module';
import { EmotionalScaleHistory } from './emotionalscalehistory/emotionalscalehistory.entity';
import { YoutubeService } from './youtube/youtube.service';
import { UnsplashService } from './unsplash/unsplash.service';
import { GamificationService } from './gamification/gamification.service';
import { GptService } from './gpt/gpt.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: +process.env.DB_PORT,
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      entities: [ChatHistory, Response, User, EmotionalScaleHistory],
      synchronize: true,
    }),
    TypeOrmModule.forFeature([
      ChatHistory,
      Response,
      User,
      EmotionalScaleHistory,
    ]),
    ChatbotModule,
    WhatsAppModule,
    ResponseModule,
    HistoryModule,
    UserModule,
  ],
  controllers: [ChatbotController, HistoryController, ResponseController],
  providers: [
    ChatbotService,
    HistoryService,
    ResponseService,
    SupportService,
    SchedulerService,
    YoutubeService,
    UnsplashService,
    GamificationService,
    GptService,
  ],
})
export class AppModule {}
