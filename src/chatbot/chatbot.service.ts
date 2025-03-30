import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { HistoryService } from 'src/history/history.service';
import { ResponseService } from 'src/response/response.service';
import { UserService } from 'src/user/user.service';
import { WhatsAppService } from 'src/whatsapp/whatsapp.service';
import { ChatbotResponse } from './chatbot.entity';
import { User } from 'src/user/user.entity';
import { UnsplashService } from 'src/unsplash/unsplash.service';
import { YoutubeService } from 'src/youtube/youtube.service';
import { GamificationService } from 'src/gamification/gamification.service';
import { GptService } from 'src/gpt/gpt.service';

@Injectable()
export class ChatbotService implements OnModuleInit {
  private readonly logger = new Logger(ChatbotService.name);
  private readonly stressKeywords = [
    'estrés',
    'estres',
    'ansiedad',
    'ansioso',
    'nervios',
    'relajarme',
    'calmarme',
    'abrumado',
    'tensión',
    'preocupado',
    'agobiado',
    'estresada',
    'angustia',
    'quemado',
    'burnout',
    'pánico',
    'no puedo más',
    'colapsado',
  ];

  private readonly crisisKeywords = [
    'suicidio',
    'morir',
    'ayuda urgente',
    'no puedo respirar',
    'quiero desaparecer',
    'no valgo nada',
  ];

  constructor(
    private readonly historyService: HistoryService,
    private readonly responseService: ResponseService,
    private readonly userService: UserService,
    private readonly whatsappService: WhatsAppService,
    private readonly unsplashService: UnsplashService,
    private readonly youtubeService: YoutubeService,
    private readonly gamificationService: GamificationService,
    private readonly gptService: GptService,
  ) {}

  async onModuleInit() {
    setInterval(async () => {
      await this.sendFollowUpMessages();
    }, 60000);
  }

  // --- Métodos principales ---
  async processMessage(
    message: string,
    phoneNumber: string,
  ): Promise<ChatbotResponse> {
    let responseSent = false;
    let finalResponse: ChatbotResponse | null = null;

    try {
      const normalizedMessage = this.normalizeMessage(message);
      const user = await this.userService.findByPhoneNumber(phoneNumber);

      // 1. Manejo de crisis (prioridad máxima)
      if (this.isCrisisMessage(normalizedMessage)) {
        finalResponse = this.buildResponse(
          this.getCrisisResponse(),
          user?.userName,
        );
        responseSent = true;
      }

      // 2. Manejo de feedback
      if (
        !responseSent &&
        (normalizedMessage === '👍' || normalizedMessage === '👎')
      ) {
        finalResponse = await this.handleFeedback(user, normalizedMessage);
        responseSent = true;
      }

      // 3. Manejo de cancelación
      if (!responseSent && normalizedMessage === 'cancelar') {
        finalResponse = await this.handleCancelation(user);
        responseSent = true;
      }

      // 4. Flujo para nuevos usuarios
      if (!responseSent && !user) {
        finalResponse = await this.handleNewUser(phoneNumber);
        responseSent = true;
      }

      if (user) {
        // Actualizar interacción y gamificación
        await this.updateInteractionStreak(user);
        await this.gamificationService.addPoints(user, 1);

        // 5. Buscar respuesta local primero
        if (!responseSent) {
          const localResponse = await this.getLocalResponse(
            user,
            normalizedMessage,
            message,
          );
          if (localResponse) {
            finalResponse = localResponse;
            responseSent = true;
          }
        }

        // 6. Manejo de estados específicos
        if (!responseSent) {
          finalResponse = await this.handleUserStates(
            user,
            normalizedMessage,
            message,
          );
          responseSent = finalResponse !== null;
        }

        // 7. Manejo de escala emocional
        if (!responseSent) {
          const escala = this.parseEscala(message);
          if (escala !== undefined) {
            finalResponse = await this.handleEmotionalScale(
              user,
              escala,
              phoneNumber,
            );
            responseSent = true;
          }
        }
      }

      // 8. Finalmente, usar GPT si no hay respuesta local
      if (!responseSent && user) {
        finalResponse = await this.getAIResponse(user, message);
        responseSent = true;
      }

      return finalResponse || this.getErrorResponse();
    } catch (error) {
      this.logger.error(
        `Error en processMessage: ${error.message}`,
        error.stack,
      );
      return this.getErrorResponse();
    }
  }

  // --- Métodos de ayuda ---
  private normalizeMessage(message: string): string {
    return message
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  private isCrisisMessage(message: string): boolean {
    return this.crisisKeywords.some((keyword) =>
      this.normalizeMessage(message).includes(keyword),
    );
  }

  private getCrisisResponse(): string {
    return (
      `⚠️ **¡Veo que estás en una situación difícil!** ⚠️\n\n` +
      `1. Llama a tu línea local de ayuda: *0994101922* 📱\n` +
      `2. Ejercicio de grounding: Nombra:\n   - 5 cosas que ves 👀\n   - 4 que puedes tocar ✋\n   - 3 que oyes 👂\n` +
      `3. Respira conmigo: Inhala 4s... Mantén 7s... Exhala 8s... 🧘`
    );
  }

  private buildResponse(
    message: string,
    userName?: string,
    emotionalScale?: number,
  ): ChatbotResponse {
    return {
      response: message,
      emotionalScale,
      userName,
      metadata: { timestamp: new Date().toISOString() },
    };
  }

  // --- Manejo de usuarios ---
  private async handleNewUser(phoneNumber: string): Promise<ChatbotResponse> {
    await this.userService.createUser({
      phoneNumber,
      userName: '',
      wantsSupport: true,
      interactionStreak: 0,
      positiveEmotionStreak: 0,
      isSettingFollowUpTime: false,
      isChoosingResource: false,
      isChoosingStressOption: false,
      recentlyOfferedHelp: false,
      lastInteraction: new Date(),
      points: 0,
      unlockedAchievements: [],
    });

    return {
      response: '¡Hola! ✨ Soy Lumi, tu chatbot de apoyo. ¿Cómo te llamas?',
      emotionalScale: undefined,
      userName: undefined,
    };
  }

  private async updateInteractionStreak(user: User): Promise<void> {
    const today = new Date();
    const lastInteractionDate = user.lastInteraction;

    if (lastInteractionDate) {
      const diffInDays = Math.floor(
        (today.getTime() - lastInteractionDate.getTime()) /
          (1000 * 60 * 60 * 24),
      );

      if (diffInDays === 1) {
        user.interactionStreak += 1;
        await this.gamificationService.addPoints(user, 5);
      } else if (diffInDays > 1) {
        user.interactionStreak = 1;
      }
    } else {
      user.interactionStreak = 1;
    }

    user.lastInteraction = today;
    await this.userService.updateUser(user);
  }

  // --- Respuestas locales ---
  private async getLocalResponse(
    user: User,
    normalizedMessage: string,
    originalMessage: string,
  ): Promise<ChatbotResponse | null> {
    // 1. Comandos especiales
    if (normalizedMessage.startsWith('/')) {
      return this.handleCommands(user, normalizedMessage);
    }

    // 2. Buscar en respuestas locales configuradas
    const context = this.getCurrentContext(user);
    const localResponse = await this.responseService.getBestResponse(
      context,
      originalMessage,
    );

    if (localResponse) {
      return this.buildResponse(localResponse, user.userName);
    }

    return null;
  }

  private getCurrentContext(user: User): string {
    if (user.isSettingFollowUpTime) return 'followup';
    if (user.isChoosingResource) return 'resource';
    if (user.isChoosingStressOption) return 'stress';
    if (!user.userName) return 'name_registration';
    return 'general';
  }

  private async handleUserStates(
    user: User,
    normalizedMessage: string,
    message: string,
  ): Promise<ChatbotResponse | null> {
    // 1. Manejo de estados específicos
    if (user.isSettingFollowUpTime) {
      return this.handleFollowUpTimeSetting(user, message);
    }
    if (user.isChoosingResource) {
      if (['foto', 'video', 'música'].includes(normalizedMessage)) {
        return this.handleResourceRequest(
          user,
          normalizedMessage as 'foto' | 'video' | 'música',
        );
      } else {
        return this.buildResponse(
          'Por favor elige una opción válida: "foto", "video" o "música"',
          user.userName,
        );
      }
    }
    if (user.isChoosingStressOption) {
      return this.handleStressOptionSelection(user, message);
    }

    // 2. Flujos especiales
    if (normalizedMessage.includes('hola')) {
      return this.handleGreeting(user);
    }
    if (!user.userName) {
      return this.handleUserNameRegistration(user, message);
    }

    // 3. Detección de estrés
    if (
      !user.recentlyOfferedHelp &&
      this.isStressRelatedMessage(normalizedMessage)
    ) {
      return this.handleStressResponse(user);
    }

    return null;
  }

  private async handleCancelation(user: User): Promise<ChatbotResponse> {
    await this.userService.updateUser({
      ...user,
      isSettingFollowUpTime: false,
      isChoosingResource: false,
      isChoosingStressOption: false,
    });
    return this.buildResponse(
      'Operación cancelada. ¿En qué más puedo ayudarte?',
      user.userName,
    );
  }

  private async handleCommands(
    user: User,
    command: string,
  ): Promise<ChatbotResponse> {
    switch (command) {
      case '/estadisticas':
        const insights = await this.getWeeklyInsights(user);
        return this.buildResponse(
          `📊 *Tus estadísticas:*${insights}`,
          user.userName,
        );

      case '/ayuda':
        return this.buildResponse(
          `🛟 *Comandos disponibles:*\n\n` +
            `*/estadisticas* - Ver tus insights semanales 📈\n` +
            `*/recursos* - Mostrar opciones de relajación 🤔\n` +
            `*/recordatorio* - Configurar seguimiento ⏰`,
          user.userName,
        );

      case '/recursos':
        return this.handleStressResponse(user);

      case '/recordatorio':
        return this.handleReminderOption(user);

      default:
        return this.buildResponse(
          'Comando no reconocido. Usa /ayuda para ver opciones disponibles.',
          user.userName,
        );
    }
  }

  // --- Flujos de conversación ---
  private async handleGreeting(user: User): Promise<ChatbotResponse> {
    const emoji = user.positiveEmotionStreak > 3 ? '🌟' : '✨';
    let response: string;

    if (!user.userName) {
      response = `¡Hola! ${emoji} Soy Lumi, tu chatbot de apoyo. ¿Cómo te llamas?`;
    } else if (user.interactionStreak > 3) {
      response =
        `¡Hola de nuevo, ${user.userName}! ${emoji} ¿En una escala del 1 al 10, cómo te sientes hoy?\n\n` +
        `Puedes usar:\n` +
        `- /recursos para opciones de relajación 🤔\n` +
        `- /recordatorio para programar seguimientos ⏰\n` +
        `- /ayuda para ver todos los comandos ⛑️`;
    } else {
      response =
        `¡Hola, ${user.userName}! ${emoji} ¿En una escala del 1 al 10, cómo te sientes hoy?\n\n` +
        `También puedes usar comandos como /recursos o /ayuda 🥺`;
    }

    return this.buildResponse(response, user.userName);
  }

  private async handleUserNameRegistration(
    user: User,
    message: string,
  ): Promise<ChatbotResponse> {
    await this.userService.updateUser({
      ...user,
      userName: message,
    });

    return this.buildResponse(
      `¡Hola, ${message}! 😊 ¿En una escala del 1 al 10, cómo te sientes hoy?`,
      message,
    );
  }

  private parseEscala(message: string): number | undefined {
    const match = message.match(/\b([1-9]|10)\b/);
    return match ? parseInt(match[0], 10) : undefined;
  }

  // --- Integración con GPT ---
  private async getAIResponse(
    user: User,
    message: string,
  ): Promise<ChatbotResponse> {
    try {
      const context = this.buildEnhancedContext(user);
      const response = await this.gptService.generateResponse(message, context);
      await this.gamificationService.addPoints(user, 3); // Puntos por usar GPT

      // Verificar logros desbloqueados
      const newAchievements =
        await this.gamificationService.checkAchievements(user);
      if (newAchievements.length > 0) {
        return this.buildResponse(
          `${response}\n\n🎉 ¡Logro desbloqueado!: ${newAchievements.join(', ')}`,
          user.userName,
        );
      }

      return this.buildResponse(response, user.userName);
    } catch (error) {
      this.logger.error('Error con GPT:', error);
      return this.getFallbackResponse(user);
    }
  }

  private buildEnhancedContext(user: User): string {
    const baseContext = `
      ## Rol:
      Eres Lumi, un chatbot de apoyo emocional con las siguientes características:
      - Empático pero profesional
      - Usa emojis moderadamente (2-3 por respuesta)
      - Responde en español coloquial pero correcto
      - Sé conciso (máximo 2 párrafos)
  
      ## Contexto del usuario:
      ${this.buildContext(user)}
  
      ## Directivas:
      1. Para saludos: Pregunta por su estado emocional (1-10)
      2. Si detectas estrés: Ofrece técnicas de respiración o recursos
      3. En crisis: Muestra números de emergencia (0994101922)
      4. Usa el nombre del usuario (${user.userName || 'amigo/a'})
      5. Para comandos (/ayuda, /recursos): Responde brevemente
    `;

    // Añade contexto adicional según el estado del usuario
    if (user.isChoosingResource) {
      return (
        baseContext +
        '\n- El usuario está eligiendo un recurso (foto/video/música)'
      );
    }
    if (user.emotionalScale && user.emotionalScale < 5) {
      return baseContext + '\n- El usuario reportó estado emocional bajo';
    }

    return baseContext;
  }

  private buildContext(user: User): string {
    return `
      Nombre: ${user.userName || 'No proporcionado'}
      Estado emocional: ${user.emotionalScale || 'No reportado'}/10
      Puntos: ${user.points || 0}
      Logros: ${user.unlockedAchievements?.join(', ') || 'Ninguno'}
      Interacciones consecutivas: ${user.interactionStreak}
      Recursos usados: ${user.resourcesUsed?.map((r) => r.type).join(', ') || 'Ninguno'}
      Último feedback: ${user.lastFeedback || 'Ninguno'}
    `;
  }

  private getFallbackResponse(user: User): ChatbotResponse {
    const fallbacks = [
      `Vaya, tengo dificultades técnicas. ¿Podrías repetirlo, ${user.userName || ''}?`,
      'Estoy teniendo problemas para entender. ¿Podrías reformularlo?',
      '¡Ups! Algo no funcionó. ¿Quieres intentarlo de nuevo?',
    ];

    return this.buildResponse(
      fallbacks[Math.floor(Math.random() * fallbacks.length)],
      user.userName,
    );
  }

  private async handleEmotionalScale(
    user: User,
    escala: number,
    phoneNumber: string,
  ): Promise<ChatbotResponse> {
    await this.historyService.saveEmotionalScale(phoneNumber, escala);
    await this.updatePositiveEmotionStreak(user, escala);
    await this.userService.updateUser({
      ...user,
      emotionalScale: escala,
    });

    const responseMessage = this.getEscalaResponse(escala, user);

    if (escala < 5) {
      return this.offerStressSupport(user, responseMessage);
    }

    return this.buildResponse(responseMessage, user.userName, escala);
  }

  private getEscalaResponse(escala: number, user: User): string {
    const emoji = this.getEmojiByScale(escala);
    const streakMsg =
      user.positiveEmotionStreak > 3
        ? ` ¡Llevas ${user.positiveEmotionStreak} días sintiéndote bien! 🌟`
        : '';

    if (escala >= 7) {
      return (
        `¡Me alegra que te sientas bien! ${emoji}${streakMsg} ¿En qué más puedo ayudarte?\n\n` +
        `Recuerda que puedes usar /recursos cuando lo necesites 😊`
      );
    } else if (escala >= 5) {
      return (
        `Entiendo que no te sientas del todo bien ${emoji}. ¿Quieres hablar sobre ello?\n\n` +
        `También puedes probar con /recursos para encontrar ayuda 🥺`
      );
    } else {
      return (
        `Veo que estás pasando un momento difícil ${emoji}. ¿Te gustaría que te ayude con algún recurso para sentirte mejor?\n\n` +
        `Puedes elegir:\n` +
        `1. 🌄 Foto relajante\n` +
        `2. 🧘 Video de meditación\n` +
        `3. 🎵 Música relajante\n` +
        `O usar el comando /recursos 🤔`
      );
    }
  }

  private getEmojiByScale(escala: number): string {
    if (escala >= 7) return '😊';
    if (escala >= 5) return '😐';
    return '😔';
  }

  // --- Manejo de estrés y recursos ---
  private isStressRelatedMessage(message: string): boolean {
    return this.stressKeywords.some((keyword) =>
      this.normalizeMessage(message).includes(keyword),
    );
  }

  private async handleStressResponse(user: User): Promise<ChatbotResponse> {
    const weeklyInsights = await this.getWeeklyInsights(user);
    await this.userService.updateUser({
      ...user,
      isChoosingStressOption: true,
      recentlyOfferedHelp: true,
    });

    const options = [
      '1. 🌄 Foto relajante',
      '2. 🧘 Video de meditación',
      '3. 🎵 Música relajante',
      '4. 💬 Hablar de cómo me siento',
      '5. ⏰ Configurar recordatorio',
    ].join('\n');

    return this.buildResponse(
      `${this.getStressResponse(user.userName)}${weeklyInsights}\n\n_Elige una opción 🥺:_\n${options}`,
      user.userName,
    );
  }

  private getStressResponse(userName: string): string {
    return `Entiendo que te sientas estresado/a 😓 ${userName ? `, ${userName}` : ''}.\n\n`;
  }

  private async offerStressSupport(
    user: User,
    initialMessage: string = '',
  ): Promise<ChatbotResponse> {
    await this.userService.updateUser({
      ...user,
      isChoosingStressOption: true,
    });

    const options = [
      '1. 🌄 Foto relajante',
      '2. 🧘 Video de meditación',
      '3. 🎵 Música relajante',
      '4. 💬 Hablar de cómo me siento',
      '5. ⏰ Configurar recordatorio',
    ].join('\n');

    return this.buildResponse(
      `${initialMessage}\n\nParece que podrías necesitar apoyo 🥺. Elige una opción:\n${options}`,
      user.userName,
    );
  }

  private async handleStressOptionSelection(
    user: User,
    message: string,
  ): Promise<ChatbotResponse> {
    const normalizedMessage = this.normalizeMessage(message);
    const optionMap: Record<string, () => Promise<ChatbotResponse>> = {
      '1': () => this.handleResourceRequest(user, 'foto'),
      '2': () => this.handleResourceRequest(user, 'video'),
      '3': () => this.handleResourceRequest(user, 'música'),
      '4': () => this.handleTalkOption(user),
      '5': () => this.handleReminderOption(user),
      foto: () => this.handleResourceRequest(user, 'foto'),
      video: () => this.handleResourceRequest(user, 'video'),
      música: () => this.handleResourceRequest(user, 'música'),
      hablar: () => this.handleTalkOption(user),
      recordatorio: () => this.handleReminderOption(user),
    };

    const handler = optionMap[normalizedMessage];
    if (handler) {
      return handler();
    }

    await this.userService.updateUser({
      ...user,
      isChoosingStressOption: false,
    });
    return this.buildResponse(
      'No entendí tu elección 🚫. Por favor elige una opción del 1 al 5 o escribe "foto", "video", "música", "hablar" o "recordatorio".',
      user.userName,
    );
  }

  private async handleResourceRequest(
    user: User,
    type: 'foto' | 'video' | 'música',
  ): Promise<ChatbotResponse> {
    await this.userService.updateUser({
      ...user,
      isChoosingStressOption: false,
      isChoosingResource: true,
    });

    const queryMap = {
      foto: 'naturaleza relajante',
      video: 'meditación guiada',
      música: 'música relajante',
    };

    try {
      let resource: { url: string; type: string };

      if (type === 'foto') {
        const images = await this.unsplashService.searchImages(
          queryMap[type],
          1,
        );
        if (!images.length) throw new Error('No images found');
        resource = { url: images[0].url, type: 'image' };
      } else {
        const videos = await this.youtubeService.searchVideos(
          queryMap[type],
          1,
        );
        if (!videos.length) throw new Error('No videos found');
        resource = { url: videos[0].url, type: 'video' };
      }

      await this.userService.updateUser({
        ...user,
        isChoosingResource: false,
      });

      const responseText =
        type === 'foto'
          ? `Aquí tienes una imagen relajante 🖼️:\n${resource.url}`
          : `Aquí tienes un video de ${type} 🎵:\n${resource.url}`;

      return this.buildResponse(
        `${responseText}\n\n¿Te gustó? (Responde 👍/👎)`,
        user.userName,
      );
    } catch (error) {
      console.error(`Error al obtener recurso ${type}:`, error);
      return this.getResourceNotFoundResponse(user, type);
    }
  }

  private async handleTalkOption(user: User): Promise<ChatbotResponse> {
    await this.userService.updateUser({
      ...user,
      isChoosingStressOption: false,
    });
    return this.buildResponse(
      'Cuéntame más sobre cómo te sientes. Estoy aquí para escucharte 💬.',
      user.userName,
    );
  }

  private async handleReminderOption(user: User): Promise<ChatbotResponse> {
    await this.userService.updateUser({
      ...user,
      isChoosingStressOption: false,
      isSettingFollowUpTime: true,
      isChoosingResource: false,
    });

    return this.buildResponse(
      `¿A qué hora te gustaría recibir recordatorios diarios? ⏰\n\n` +
        `Por favor escribe la hora en formato 24 horas (por ejemplo: 14:30 para las 2:30 PM) 😎\n\n` +
        `Puedes cancelar en cualquier momento escribiendo "cancelar" ❌`,
      user.userName,
    );
  }

  private getResourceNotFoundResponse(
    user: User,
    type: string,
  ): ChatbotResponse {
    const alternatives = {
      foto: ['video', 'música'],
      video: ['foto', 'música'],
      música: ['foto', 'video'],
    };
    return this.buildResponse(
      `No pude encontrar ${type === 'música' ? 'música' : 'un ' + type} 😓. ¿Quieres intentar con ${alternatives[type as keyof typeof alternatives].join(' o ')}?`,
      user.userName,
    );
  }

  // --- Seguimiento y recordatorios ---
  private async handleFollowUpTimeSetting(
    user: User,
    message: string,
  ): Promise<ChatbotResponse> {
    // Permitir cancelación
    if (this.normalizeMessage(message) === 'cancelar') {
      await this.userService.updateUser({
        ...user,
        isSettingFollowUpTime: false,
      });
      return this.buildResponse(
        'Configuración de recordatorio cancelada ❌. ¿En qué más puedo ayudarte?',
        user.userName,
      );
    }

    const timeRegex = /^([01]?\d|2[0-3]):([0-5]\d)$/; // Acepta 9:30 o 09:30
    if (!timeRegex.test(message)) {
      return this.buildResponse(
        'Formato de hora no válido 🥺. Por favor ingresa la hora en formato 24h 🙄 (ej. 14:30) o escribe "cancelar"',
        user.userName,
      );
    }

    // Formatear la hora (asegurar dos dígitos)
    const [hours, minutes] = message.split(':');
    const formattedTime = `${hours.padStart(2, '0')}:${minutes}`;

    await this.userService.updateUser({
      ...user,
      followUpTime: formattedTime,
      isSettingFollowUpTime: false,
    });

    return this.buildResponse(
      `✅ Recordatorio configurado para las ${formattedTime}.\n` +
        `Te enviaré un mensaje a esta hora cada día para ver cómo estás 😊.\n\n` +
        `¿En qué más puedo ayudarte 🤔?`,
      user.userName,
    );
  }

  async sendFollowUpMessages() {
    const currentTime = new Date().toTimeString().slice(0, 5);
    const users = await this.userService.getUsersForFollowUp(currentTime);

    for (const user of users) {
      try {
        // Verificar si ya se envió un mensaje recientemente
        if (
          user.lastFollowUp &&
          new Date().getTime() - user.lastFollowUp.getTime() < 60000
        ) {
          continue;
        }

        let message: string;

        if (user.positiveEmotionStreak > 3) {
          message = `¡${user.userName}, tu racha positiva es impresionante! 🌟 ¿Sigues bien hoy?`;
        } else if (user.emotionalScale && user.emotionalScale < 5) {
          message = `Hola ${user.userName}, ¿cómo vas con ese ánimo? 😊 ¿Ha mejorado?`;
        } else {
          message = `Hola ${user.userName}, ¿cómo te sientes hoy en una escala del 1 al 10? 😊`;
        }

        const messageSent = await this.whatsappService.sendMessage(
          user.phoneNumber,
          message,
        );

        if (messageSent) {
          user.lastFollowUp = new Date();
          await this.gamificationService.addPoints(user, 2); // Puntos por responder seguimiento
          await this.userService.updateUser(user);
          this.logger.log(`Recordatorio enviado a ${user.phoneNumber}`);
        }
      } catch (error) {
        this.logger.error(
          `Error enviando follow-up a ${user.phoneNumber}: ${error.message}`,
        );
      }
    }
  }

  // --- Feedback y análisis ---
  private async handleFeedback(
    user: User,
    feedback: '👍' | '👎',
  ): Promise<ChatbotResponse> {
    await this.userService.updateUser({
      ...user,
      lastFeedback: feedback,
    });

    return this.buildResponse(
      feedback === '👍'
        ? '¡Me alegra haberte ayudado! 😊 ¿Necesitas algo más?'
        : 'Lo siento, intentaré mejorar 😓. ¿En qué fallé exactamente?',
      user.userName,
    );
  }

  private async getWeeklyInsights(user: User): Promise<string> {
    const history = await this.historyService.getHistory(user.phoneNumber);
    const lastWeek = history.filter(
      (entry) => entry.date >= new Date(Date.now() - 7 * 86400000),
    );

    if (lastWeek.length === 0) return '';

    const avg =
      lastWeek.reduce((sum, entry) => sum + entry.emotionalScale, 0) /
      lastWeek.length;
    const trend =
      avg > (user.weeklyAverage || 0) ? 'mejorando 📈' : 'bajando 📉';

    await this.userService.updateUser({ ...user, weeklyAverage: avg });

    return `\n*Insight semanal 📈:* Tu promedio fue ${avg.toFixed(1)}/10 (${trend}).`;
  }

  private async updatePositiveEmotionStreak(
    user: User,
    escala: number,
  ): Promise<void> {
    const today = new Date();
    const lastDate = user.lastPositiveEmotionDate;

    if (escala >= 7) {
      if (lastDate) {
        const diffInDays = Math.floor(
          (today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24),
        );
        user.positiveEmotionStreak =
          diffInDays === 1 ? user.positiveEmotionStreak + 1 : 1;
      } else {
        user.positiveEmotionStreak = 1;
      }
      user.lastPositiveEmotionDate = today;
    } else {
      user.positiveEmotionStreak = 0;
    }

    await this.userService.updateUser(user);
  }

  private getErrorResponse(): ChatbotResponse {
    return this.buildResponse(
      'Hubo un error al procesar tu mensaje. Por favor, inténtalo de nuevo.',
      undefined,
    );
  }
}
