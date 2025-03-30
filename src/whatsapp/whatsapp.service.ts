import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';

@Injectable()
export class WhatsAppService {
  private readonly apiUrl: string;
  private readonly token: string;

  constructor(private readonly httpService: HttpService) {
    this.apiUrl = process.env.WHATSAPP_API_URL;
    this.token = process.env.WHATSAPP_API_TOKEN;
  }

  async sendMessage(phoneNumber: string, message: string): Promise<boolean> {
    if (!phoneNumber || !message) {
      throw new BadRequestException('Se requieren número y mensaje');
    }

    try {
      const response = await this.httpService
        .post(
          this.apiUrl,
          {
            messaging_product: 'whatsapp',
            to: phoneNumber,
            type: 'text',
            text: { body: message },
          },
          {
            headers: {
              Authorization: `Bearer ${this.token}`,
              'Content-Type': 'application/json',
            },
          },
        )
        .toPromise();

      return response.status === 200;
    } catch (error) {
      console.error(
        'Error enviando mensaje:',
        error.response?.data || error.message,
      );
      throw new InternalServerErrorException(
        'Error al enviar mensaje por WhatsApp',
      );
    }
  }

  async scheduleNotification(
    phoneNumber: string,
    message: string,
    sendAt: Date,
  ): Promise<{ success: boolean; error?: string }> {
    // Implementación básica - en producción usarías un sistema de colas como Bull
    const now = new Date();
    const delay = sendAt.getTime() - now.getTime();

    if (delay > 0) {
      setTimeout(() => {
        this.sendMessage(phoneNumber, message);
      }, delay);
      return { success: true };
    }
    return { success: false, error: 'La fecha programada debe ser futura' };
  }
}
