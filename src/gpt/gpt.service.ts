import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';

@Injectable()
export class GptService {
  private readonly logger = new Logger(GptService.name);
  private readonly openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  async generateResponse(
    userMessage: string,
    context: string,
  ): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo', // Modelo incluido en Plus
        messages: [
          {
            role: 'system',
            content: `Eres Lumi, un chatbot de salud mental. Sigue estas reglas:
              1. Usa el contexto del usuario: ${context}
              2. Basa tus respuestas en el conocimiento de Lumi (técnicas de relajación, etc.)
              3. Sé empático y profesional.`,
          },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.7,
        max_tokens: 300,
      });

      return response.choices[0].message.content;
    } catch (error) {
      this.logger.error(`Error en GPT: ${error.message}`);
      throw error;
    }
  }
}
