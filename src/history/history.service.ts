import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Not, Repository } from 'typeorm';
import { ChatHistory } from './history.entity';
import { User } from 'src/user/user.entity';
import { EmotionalScaleHistory } from 'src/emotionalscalehistory/emotionalscalehistory.entity';
import { UserService } from 'src/user/user.service';

@Injectable()
export class HistoryService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,

    @InjectRepository(ChatHistory)
    private chatHistoryRepository: Repository<ChatHistory>,

    @InjectRepository(EmotionalScaleHistory)
    private emotionalScaleHistoryRepository: Repository<EmotionalScaleHistory>,

    @InjectRepository(Response)
    private readonly responseRepository: Repository<Response>,
    private readonly userService: UserService,
  ) {}

  async saveMessage(
    phoneNumber: string,
    message: string,
    response: string,
    emotionalScale?: number,
  ) {
    try {
      console.log('Guardando mensaje en el historial:', {
        phoneNumber,
        message,
        response,
        emotionalScale,
      });

      const historyEntry = this.chatHistoryRepository.create({
        phoneNumber,
        message,
        response,
        emotionalScale,
      });

      const result = await this.chatHistoryRepository.save(historyEntry);
      console.log('Mensaje guardado con ID:', result.id);
      return result;
    } catch (error) {
      console.error('Error al guardar el mensaje:', error);
      throw error;
    }
  }

  async handleMessage(
    phoneNumber: string,
    message: string,
    response: string,
    emotionalScale?: number,
  ) {
    try {
      await this.userRepository.upsert(
        {
          phoneNumber,
          emotionalScale,
          lastInteraction: new Date(),
          interactionStreak: () => 'interaction_streak + 1',
        },
        ['phoneNumber'],
      );

      await this.saveMessage(phoneNumber, message, response, emotionalScale);
    } catch (error) {
      console.error('Error en handleMessage:', error);
      throw error;
    }
  }

  async getUserHistory(phoneNumber: string) {
    try {
      let user = await this.userRepository.findOne({
        where: { phoneNumber },
      });

      if (!user) {
        user = this.userRepository.create({
          phoneNumber,
          wantsSupport: true,
          interactionStreak: 0,
          positiveEmotionStreak: 0,
          isSettingFollowUpTime: false,
        });
        await this.userRepository.save(user);
      }

      const history = await this.chatHistoryRepository.find({
        where: { phoneNumber },
        order: { timestamp: 'DESC' },
      });

      return { user, history };
    } catch (error) {
      console.error('Error en getUserHistory:', error);
      throw error;
    }
  }

  async updateUserData(phoneNumber: string, data: Partial<User>) {
    try {
      let user = await this.userRepository.findOne({ where: { phoneNumber } });

      if (user) {
        this.userRepository.merge(user, data);
      } else {
        user = this.userRepository.create({ phoneNumber, ...data });
      }

      await this.userRepository.save(user);
    } catch (error) {
      console.error('Error al actualizar datos del usuario:', error);
      throw error;
    }
  }

  async getGeneralStatistics() {
    // 📊 Total de interacciones (número total de mensajes en el historial)
    const totalInteractions = await this.chatHistoryRepository.count();

    // 🔍 Preguntas sin respuesta (mensajes que no tienen una respuesta válida en la base local)
    const unansweredQuestions = await this.chatHistoryRepository.count({
      where: { response: '' }, // Suponiendo que un mensaje sin respuesta tiene response vacío
    });

    // 💬 Preguntas más frecuentes (ranking de mensajes más repetidos)
    const topQuestions = await this.chatHistoryRepository
      .createQueryBuilder('chat')
      .select('chat.message', 'chat_message') // Asegurar este alias
      .addSelect('COUNT(*)', 'count')
      .where('chat.message IS NOT NULL')
      .andWhere('LENGTH(TRIM(chat.message)) > 0') // Excluir mensajes vacíos
      .groupBy('chat.message')
      .orderBy('count', 'DESC')
      .limit(5)
      .getRawMany();

    // 🤖 Total de respuestas enviadas
    const totalResponses = await this.chatHistoryRepository.count({
      where: { response: Not('') }, // Excluye respuestas vacías
    });

    // ⚖️ Distribución entre respuestas locales vs. GPT
    const localResponses = await this.responseRepository.count();
    const gptResponses = await this.getGptRequestCount();

    return {
      totalInteractions,
      unansweredQuestions,
      topQuestions,
      totalResponses,
      responseDistribution: {
        local: localResponses,
        gpt: gptResponses,
      },
      responseEffectiveness: await this.calculateResponseEffectivenessScore(),
    };
  }

  // Nuevo método para contar solicitudes GPT
  private async getGptRequestCount(): Promise<number> {
    return this.chatHistoryRepository.count({
      where: {
        response: Not(''), // Asumiendo que todas las respuestas no vacías son de GPT
      },
    });
  }

  private async calculateResponseEffectivenessScore(): Promise<number> {
    const result = await this.chatHistoryRepository
      .createQueryBuilder('history')
      .select('AVG(history.emotionalScale)', 'avgEffectiveness') // <-- Aquí está el error
      .where('history.emotionalScale IS NOT NULL')
      .getRawOne();

    return result?.avgEffectiveness
      ? parseFloat(result.avgEffectiveness) / 10
      : 0;
  }

  async updateWantsSupport(phoneNumber: string, wantsSupport: boolean) {
    await this.userRepository.update({ phoneNumber }, { wantsSupport });
  }

  async getUsersNeedingSupport(): Promise<User[]> {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    return this.userRepository.find({
      where: {
        wantsSupport: true,
        lastInteraction: LessThan(twentyFourHoursAgo),
      },
    });
  }

  async updatePositiveEmotionStreak(user: User, escala: number) {
    const today = new Date();
    const lastPositiveEmotionDate = user.lastPositiveEmotionDate;

    if (escala >= 7) {
      if (lastPositiveEmotionDate) {
        const diffInDays = Math.floor(
          (today.getTime() - lastPositiveEmotionDate.getTime()) /
            (1000 * 60 * 60 * 24),
        );

        if (diffInDays === 1) {
          user.positiveEmotionStreak += 1;
        } else if (diffInDays > 1) {
          user.positiveEmotionStreak = 1;
        }
      } else {
        user.positiveEmotionStreak = 1;
      }

      user.lastPositiveEmotionDate = today;
    } else {
      user.positiveEmotionStreak = 0;
    }

    await this.userService.updateUser(user);
  }

  async updateUserName(phoneNumber: string, userName: string) {
    let userRecord = await this.userRepository.findOne({
      where: { phoneNumber },
    });

    if (userRecord) {
      await this.userRepository.save(userRecord);
    } else {
      // Si no existe, creamos un nuevo registro con el nombre del usuario
      userRecord = this.userRepository.create({ phoneNumber, userName });
      await this.userRepository.save(userRecord);
    }
  }

  async saveEmotionalScale(phoneNumber: string, scale: number) {
    try {
      const user = await this.userRepository.findOne({
        where: { phoneNumber },
      });
      if (!user) throw new Error('User not found');

      const scaleHistory = this.emotionalScaleHistoryRepository.create({
        scale,
        user,
      });

      await this.emotionalScaleHistoryRepository.save(scaleHistory);

      // Actualizar la escala emocional actual del usuario
      user.emotionalScale = scale;
      await this.userRepository.save(user);
    } catch (error) {
      console.error('Error al guardar la escala emocional:', error);
      throw error;
    }
  }

  // 👇 Nuevo método para obtener historial
  async getHistory(phoneNumber: string): Promise<ChatHistory[]> {
    return this.chatHistoryRepository.find({
      where: { phoneNumber },
      order: { date: 'DESC' }, // Ordenar por fecha descendente
    });
  }

  async getEmotionalScaleHistory(phoneNumber: string) {
    const user = await this.userRepository.findOne({
      where: { phoneNumber },
      relations: ['emotionalScales'],
    });
    return user?.emotionalScales || [];
  }

  async getEmotionalScaleStatistics(phoneNumber: string) {
    // Obtener el historial de escalas emocionales del usuario
    const history = await this.emotionalScaleHistoryRepository.find({
      where: { user: { phoneNumber } },
      order: { timestamp: 'ASC' }, // Ordenar por fecha ascendente
    });

    if (history.length === 0) {
      return null; // No hay datos para generar estadísticas
    }

    // Calcular estadísticas
    const scales = history.map((entry) => entry.scale);
    const averageScale =
      scales.reduce((sum, scale) => sum + scale, 0) / scales.length;
    const maxScale = Math.max(...scales);
    const minScale = Math.min(...scales);
    const totalEntries = scales.length;

    // Determinar la tendencia (mejora, empeora o estable)
    let trend = 'stable';
    if (scales.length >= 2) {
      const lastScale = scales[scales.length - 1];
      const previousScale = scales[scales.length - 2];
      if (lastScale > previousScale) {
        trend = 'improving';
      } else if (lastScale < previousScale) {
        trend = 'worsening';
      }
    }

    return {
      averageScale: parseFloat(averageScale.toFixed(2)), // Redondear a 2 decimales
      maxScale,
      minScale,
      totalEntries,
      trend,
      history, // Opcional: devolver el historial completo
    };
  }

  async getEmotionalTrends(
    days: number,
  ): Promise<{ date: string; avgScale: number }[]> {
    const date = new Date();
    date.setDate(date.getDate() - days);

    return this.chatHistoryRepository
      .createQueryBuilder('history')
      .select('DATE(history.timestamp)', 'date')
      .addSelect('AVG(history.emotionalScale)', 'avgScale')
      .where('history.timestamp >= :date', { date })
      .andWhere('history.emotionalScale IS NOT NULL')
      .groupBy('DATE(history.timestamp)')
      .orderBy('date', 'ASC')
      .getRawMany();
  }

  async getPeakActivityHours(): Promise<{ hour: number; count: number }[]> {
    return this.chatHistoryRepository
      .createQueryBuilder('history')
      .select('EXTRACT(HOUR FROM history.timestamp)', 'hour')
      .addSelect('COUNT(*)', 'count')
      .groupBy('EXTRACT(HOUR FROM history.timestamp)')
      .orderBy('count', 'DESC')
      .limit(5)
      .getRawMany();
  }

  async calculateResponseEffectiveness(): Promise<
    { response: string; avgEffectiveness: number }[]
  > {
    return this.chatHistoryRepository
      .createQueryBuilder('history')
      .select('history.response', 'response')
      .addSelect('AVG(history.emotionalScale)', 'avgEffectiveness')
      .where('history.emotionalScale IS NOT NULL')
      .andWhere('history.response IS NOT NULL')
      .groupBy('history.response')
      .orderBy('avgEffectiveness', 'DESC')
      .getRawMany();
  }

  // Método para obtener preguntas sin respuesta
  async getUnansweredQuestions(): Promise<
    { question: string; count: number }[]
  > {
    // Opción 1: Usando query builder
    return this.chatHistoryRepository
      .createQueryBuilder('chat')
      .select('chat.message', 'question')
      .addSelect('COUNT(*)', 'count')
      .where('chat.response = :empty', { empty: '' })
      .orWhere('chat.response IS NULL')
      .groupBy('chat.message')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany();
  }

  async getAllConversations(
    phoneNumber?: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<ChatHistory[]> {
    const query = this.chatHistoryRepository
      .createQueryBuilder('chat')
      .orderBy('chat.timestamp', 'DESC');

    if (phoneNumber && phoneNumber !== 'all') {
      query.where('chat.phoneNumber LIKE :phone', {
        phone: `%${phoneNumber}%`,
      });
    }

    if (startDate) {
      query.andWhere('chat.timestamp >= :startDate', { startDate });
    }

    if (endDate) {
      query.andWhere('chat.timestamp <= :endDate', { endDate });
    }

    return query.getMany();
  }
}
