import { forwardRef, Module } from '@nestjs/common';
import { ChatbotController } from './chatbot.controller';
import { HistoryModule } from 'src/history/history.module';
import { WhatsAppModule } from 'src/whatsapp/whatsapp.module';
import { ChatbotService } from './chatbot.service';
import { ResponseModule } from 'src/response/response.module';
import { UserModule } from 'src/user/user.module';
import { UnsplashService } from 'src/unsplash/unsplash.service';
import { YoutubeService } from 'src/youtube/youtube.service';
import { GamificationService } from 'src/gamification/gamification.service';
import { GptService } from 'src/gpt/gpt.service';

@Module({
  imports: [
    HistoryModule,
    forwardRef(() => WhatsAppModule),
    ResponseModule,
    UserModule,
  ], // Usa forwardRef para WhatsAppModule
  controllers: [ChatbotController],
  providers: [
    ChatbotService,
    UnsplashService, // Registrar UnsplashService
    YoutubeService,
    GamificationService,
    GptService,
  ],
  exports: [ChatbotService],
})
export class ChatbotModule {}
