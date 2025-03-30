import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Response } from './response.entity';

@Injectable()
export class ResponseService {
  constructor(
    @InjectRepository(Response)
    private readonly responseRepository: Repository<Response>,
  ) {}

  async addResponse(
    patterns: string[],
    intent: string,
    responses: string[],
  ): Promise<Response> {
    if (!patterns.length || !responses.length) {
      throw new BadRequestException('Patterns and responses are required');
    }

    const newResponse = this.responseRepository.create({
      patterns,
      intent,
      responses,
    });
    return await this.responseRepository.save(newResponse);
  }

  async getAllResponses(): Promise<Response[]> {
    return await this.responseRepository.find();
  }

  async getResponseByIntent(intent: string): Promise<string | null> {
    const response = await this.responseRepository.findOne({
      where: { intent },
    });
    return response ? this.getRandomResponse(response.responses) : null;
  }

  async getResponseByPattern(message: string): Promise<string | null> {
    const responses = await this.responseRepository.find();
    for (const response of responses) {
      if (
        response.patterns.some((pattern) =>
          message.toLowerCase().includes(pattern.toLowerCase()),
        )
      ) {
        console.log('Patrón coincidente encontrado:', response.patterns);
        return this.getRandomResponse(response.responses);
      }
    }
    console.log('No se encontraron patrones coincidentes.');
    return null;
  }

  async getBestResponse(
    intent: string | null,
    message: string,
  ): Promise<string | null> {
    if (intent) {
      const intentResponse = await this.getResponseByIntent(intent);
      if (intentResponse) return intentResponse;
    }

    const patternResponse = await this.getResponseByPattern(message);
    return patternResponse;
  }

  private getRandomResponse(responses: string[]): string {
    return responses[Math.floor(Math.random() * responses.length)];
  }

  async importResponses(
    data: { patterns: string[]; intent: string; responses: string[] }[],
  ): Promise<{ imported: number }> {
    const results = await Promise.all(
      data.map((item) =>
        this.addResponse(item.patterns, item.intent, item.responses),
      ),
    );

    return { imported: results.filter((r) => r).length };
  }

  async updateResponse(
    id: number,
    updateData: { patterns?: string[]; intent?: string; responses?: string[] },
  ): Promise<Response> {
    const response = await this.responseRepository.findOne({ where: { id } });
    if (!response) {
      throw new NotFoundException(`Response with ID ${id} not found`);
    }

    if (updateData.patterns) response.patterns = updateData.patterns;
    if (updateData.intent !== undefined) response.intent = updateData.intent;
    if (updateData.responses) response.responses = updateData.responses;

    return this.responseRepository.save(response);
  }

  async deleteResponse(id: number): Promise<void> {
    const result = await this.responseRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Response with ID ${id} not found`);
    }
  }
}
