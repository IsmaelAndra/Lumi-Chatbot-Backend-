import { Injectable } from '@nestjs/common';
import { HistoryService } from 'src/history/history.service';
import { WhatsAppService } from 'src/whatsapp/whatsapp.service';

@Injectable()
export class SupportService {
  constructor(
    private readonly historyService: HistoryService,
    private readonly whatsappService: WhatsAppService,
  ) {}

  async sendFollowUpMessages() {
    console.log('Iniciando seguimiento automático...');
    const users = await this.historyService.getUsersNeedingSupport();
    console.log(`Usuarios encontrados: ${users.length}`);

    for (const user of users) {
      const { phoneNumber, userName } = user;
      const message = `Buenos días, ${userName}. 😊 ¿Te encuentras mejor? Sabes que puedes contar conmigo.`;

      await this.whatsappService.sendMessage(phoneNumber, message);
      await this.historyService.saveMessage(
        phoneNumber,
        'Seguimiento automático',
        message,
        undefined,
      );
    }
  }
}
