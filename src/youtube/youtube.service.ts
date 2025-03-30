import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class YoutubeService {
  private readonly apiKey: string;
  private readonly apiUrl: string;

  constructor() {
    this.apiKey = process.env.YOUTUBE_API_KEY; // Clave de API de YouTube
    this.apiUrl = process.env.YOUTUBE_API_URL; // URL de la API de YouTube
    console.log('YoutubeService initialized with API Key:', this.apiKey); // Verificación de carga de clave
  }

  async searchVideos(query: string, maxResults: number = 5) {
    try {
      const response = await axios.get(this.apiUrl, {
        params: {
          part: 'snippet',
          q: query,
          type: 'video',
          maxResults: maxResults,
          key: this.apiKey,
        },
      });

      console.log('YouTube API Response:', response.data); // Log de la respuesta

      return response.data.items.map((item) => ({
        title: item.snippet.title,
        videoId: item.id.videoId,
        url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
      }));
    } catch (error) {
      console.error(
        'Error al buscar videos en YouTube:',
        error.response?.data || error.message,
      );
      throw new Error('No se pudieron obtener los videos de YouTube.');
    }
  }
}
