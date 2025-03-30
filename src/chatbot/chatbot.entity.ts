export interface ChatbotResponse {
  response: string;
  emotionalScale?: number;
  userName?: string;
  metadata?: {
    // 👈 Nueva propiedad opcional
    timestamp: string;
    // Puedes añadir más campos aquí si lo necesitas
  };
}
