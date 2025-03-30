import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
  Query,
  Get,
} from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';
import { GptService } from '../gpt/gpt.service'; // Nuevo import
import { HistoryService } from '../history/history.service';

@Controller('whatsapp')
export class WhatsAppController {
  constructor(
    private readonly whatsappService: WhatsAppService,
    private readonly gptService: GptService,
    private readonly historyService: HistoryService,
  ) {}

  @Get()
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ) {
    if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      return challenge;
    }
    throw new UnauthorizedException('Invalid verification token');
  }

  @Post()
  async receiveMessage(@Body() body: any) {
    console.log('Body recibido:', body); // Verifica el formato del body

    let message: string;
    let phoneNumber: string;

    // WhatsApp Business API envía los mensajes en este formato
    if (
      body.entry &&
      body.entry[0].changes &&
      body.entry[0].changes[0].value.messages
    ) {
      const messageData = body.entry[0].changes[0].value.messages[0];
      message = messageData.text.body;
      phoneNumber = messageData.from;
    } else {
      return { status: 'error', message: 'Formato de mensaje no válido' };
    }

    // Obtener contexto del usuario (opcional)
    const userHistory = await this.historyService.getUserHistory(phoneNumber);
    const context = `Usuario: ${userHistory.user?.userName || 'Anónimo'}. Historial: ${userHistory.history.length} interacciones`;

    // Generar respuesta con GPT
    const gptResponse = await this.gptService.generateResponse(
      message,
      context,
    );

    // Guardar en historial
    await this.historyService.saveMessage(phoneNumber, message, gptResponse);

    // Enviar por WhatsApp
    await this.whatsappService.sendMessage(phoneNumber, gptResponse);

    return { status: 'success' };
  }

  @Post('schedule-notification')
  async scheduleNotification(
    @Body() body: { phoneNumber: string; message: string; sendAt: Date },
  ) {
    return this.whatsappService.scheduleNotification(
      body.phoneNumber,
      body.message,
      body.sendAt,
    );
  }
}
