import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppController } from './whatsapp.controller';
import { GptService } from 'src/gpt/gpt.service';
import { HistoryModule } from 'src/history/history.module';

@Module({
  imports: [HttpModule, HistoryModule],
  controllers: [WhatsAppController],
  providers: [WhatsAppService, GptService],
  exports: [WhatsAppService],
})
export class WhatsAppModule {}
