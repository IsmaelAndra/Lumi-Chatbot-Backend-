import {
  Controller,
  Post,
  Body,
  Get,
  Put,
  Param,
  Delete,
} from '@nestjs/common';
import { ResponseService } from './response.service';

@Controller('response')
export class ResponseController {
  constructor(private readonly responseService: ResponseService) {}

  @Get()
  async getAllResponses() {
    return this.responseService.getAllResponses();
  }

  @Post('add')
  async addResponse(
    @Body() data: { patterns: string[]; intent: string; responses: string[] },
  ) {
    return this.responseService.addResponse(
      data.patterns,
      data.intent,
      data.responses,
    );
  }

  @Post('import')
  async importResponses(@Body() body: { data: any[] }) {
    return this.responseService.importResponses(body.data);
  }

  @Put(':id') // Actualizar respuesta existente
  async updateResponse(
    @Param('id') id: number,
    @Body()
    data: { patterns?: string[]; intent?: string; responses?: string[] },
  ) {
    return this.responseService.updateResponse(id, data);
  }

  @Delete(':id') // Eliminar respuesta
  async deleteResponse(@Param('id') id: number) {
    return this.responseService.deleteResponse(id);
  }
}
