import { Module } from '@nestjs/common';
import { HistoryController } from './history.controller';
import { HistoryService } from './history.service';
import { ChatHistory } from './history.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/user/user.entity';
import { EmotionalScaleHistory } from 'src/emotionalscalehistory/emotionalscalehistory.entity';
import { Response } from 'src/response/response.entity';
import { UserService } from 'src/user/user.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ChatHistory,
      User,
      EmotionalScaleHistory,
      Response,
    ]),
  ],
  controllers: [HistoryController],
  providers: [HistoryService, UserService],
  exports: [HistoryService],
})
export class HistoryModule {}
