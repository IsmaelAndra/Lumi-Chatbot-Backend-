import { Controller, Get, Param, Query } from '@nestjs/common';
import { HistoryService } from './history.service';

@Controller('history')
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}

  @Get('user/:phoneNumber')
  async getUserHistory(@Param('phoneNumber') phoneNumber: string) {
    return this.historyService.getUserHistory(phoneNumber);
  }

  @Get('conversations')
  async getAllConversations(
    @Query('phoneNumber') phoneNumber?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.historyService.getAllConversations(
      phoneNumber,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('stats/general')
  async getGeneralStatistics() {
    return this.historyService.getGeneralStatistics();
  }

  @Get('stats/emotional-trends')
  async getEmotionalTrends(@Query('days') days: number = 7) {
    return this.historyService.getEmotionalTrends(days);
  }

  @Get('stats/peak-hours')
  async getPeakActivityHours() {
    return this.historyService.getPeakActivityHours();
  }

  @Get('stats/response-effectiveness')
  async getResponseEffectiveness() {
    return this.historyService.calculateResponseEffectiveness();
  }

  @Get('unanswered-questions')
  async getUnansweredQuestions() {
    return this.historyService.getUnansweredQuestions();
  }
}
