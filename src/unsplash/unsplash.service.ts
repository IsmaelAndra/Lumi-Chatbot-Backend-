import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class UnsplashService {
  private readonly apiKey: string;
  private readonly apiUrl: string;

  constructor() {
    this.apiKey = process.env.UNSPLASH_API_KEY;
    this.apiUrl = process.env.UNSPLASH_API_URL;
    console.log('UnsplashService initialized with API Key:', this.apiKey);
  }

  async searchImages(query: string, maxResults: number = 5) {
    try {
      const response = await axios.get(this.apiUrl, {
        params: {
          query: query,
          per_page: maxResults,
          client_id: this.apiKey,
        },
      });

      console.log('Unsplash API Response:', response.data);

      return response.data.results.map((image) => ({
        description: image.description || 'Imagen relajante',
        url: image.urls.regular,
      }));
    } catch (error) {
      console.error(
        'Error al buscar imágenes en Unsplash:',
        error.response?.data || error.message,
      );
      throw new Error('No se pudieron obtener las imágenes de Unsplash.');
    }
  }
}
