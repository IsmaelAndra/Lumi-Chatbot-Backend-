import {
  Controller,
  Post,
  Body,
  InternalServerErrorException,
  Get,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { ChatbotService } from './chatbot.service';
import { HistoryService } from 'src/history/history.service';
import { WhatsAppService } from 'src/whatsapp/whatsapp.service';

@Controller('chatbot')
export class ChatbotController {
  constructor(
    private readonly chatbotService: ChatbotService,
    private readonly whatsappService: WhatsAppService,
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
  // En tu controlador:
  @Post()
  async handleMessage(@Body() body: any) {
    console.log('Body recibido:', body);

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

    try {
      // Llamar al servicio de chatbot para procesar el mensaje
      const responseObj = await this.chatbotService.processMessage(
        message,
        phoneNumber,
      );

      // Extraer la respuesta y la escala emocional
      const { response, emotionalScale } = responseObj;

      // Guardar en el historial
      await this.historyService.saveMessage(
        phoneNumber,
        message,
        response,
        emotionalScale,
      );

      // Enviar respuesta por WhatsApp
      await this.whatsappService.sendMessage(phoneNumber, response);

      // Retornar la respuesta al usuario
      return { response };
    } catch (error) {
      console.error('Error handling message:', error);
      throw new InternalServerErrorException('Failed to process message');
    }
  }

  @Post('disable-support')
  async disableSupport(@Body() body: { phoneNumber: string }) {
    const { phoneNumber } = body;
    await this.historyService.updateWantsSupport(phoneNumber, false);
    return { message: 'Acompañamiento desactivado.' };
  }
}
