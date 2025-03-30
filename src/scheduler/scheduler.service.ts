import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/user/user.entity';
import { WhatsAppService } from 'src/whatsapp/whatsapp.service';
import { Repository } from 'typeorm';

@Injectable()
export class SchedulerService {
  constructor(
    private readonly whatsappService: WhatsAppService,

    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  @Cron('0 * * * * *')
  async checkFollowUps() {
    const now = new Date();
    const currentTime = now.toISOString().split('T')[1].substring(0, 5);

    const usersToFollowUp = await this.userRepository.find({
      where: { followUpTime: currentTime, wantsSupport: true },
    });

    for (const user of usersToFollowUp) {
      await this.whatsappService.sendMessage(
        user.phoneNumber,
        `Hola ${user.userName}, quería saber cómo te sientes hoy 😊. ¿En una escala del 1 al 10, cómo te sientes ahora?`,
      );

      user.lastFollowUp = new Date();
      await this.userRepository.save(user);
    }
  }
}
