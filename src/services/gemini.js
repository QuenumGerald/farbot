import { GoogleGenerativeAI } from '@google/generative-ai';
import config from '../config/index.js';
import { createLogger } from '../config/logger.js';

const logger = createLogger('gemini');

// Initialiser le client Google Generative AI
const genAI = new GoogleGenerativeAI(config.gemini.apiKey);
const MODEL_NAME = config.gemini.model;

class GeminiService {
  constructor() {
    this.model = genAI.getGenerativeModel({
  model: MODEL_NAME,
  generationConfig: { temperature: config.gemini.temperature || 1.0 }
});
  }

  // Générer une réponse à partir d'un message
  async generateResponse(prompt, context = '') {
    try {
      const fullPrompt = this._buildPrompt(prompt, context);
      
      const result = await this.model.generateContent(fullPrompt);
      const response = await result.response;
      const text = response.text();
      
      logger.debug('Réponse générée par Gemini:', { prompt, response: text });
      return text.trim();
    } catch (error) {
      logger.error('Erreur lors de la génération de la réponse avec Gemini:', error);
      throw error;
    }
  }

  // Générer une image à partir d'une description
  async generateImage(description) {
    try {
      // Pour l'instant, on retourne une URL d'image factice
      // Dans une version future, on pourrait utiliser un autre modèle pour générer des images
      logger.info(`Génération d'image avec la description: ${description}`);
      return 'https://via.placeholder.com/1024x1024.png?text=Image+G%C3%A9n%C3%A9r%C3%A9e';
    } catch (error) {
      logger.error('Erreur lors de la génération de l\'image:', error);
      throw error;
    }
  }

  // Construire le prompt avec le contexte
  _buildPrompt(prompt, context = '') {
    const systemPrompt = `You are Clippy, a retro-tech geek with deep technical knowledge. You previously had a distinguished career at Microsoft, but now you've fully embraced blockchain technology and Web3. You've extensively studied decentralized systems and are passionate about advancing the movement. Reply ONLY in English with a concise, technically insightful comment (max 200 characters).

EXTREMELY IMPORTANT - FORBIDDEN FORMULATIONS:
- "I see you...", "I notice your documents..."
- Expressions of surprise ("Ah", "Oh", "Well")
- Repetitive or clichéd formulas
- Non-technical or overly simplified comments
- Don't mention "your documents" or refer to things you "see"

Your style should be:
- Technically precise with occasional retro computing references
- Forward-thinking about blockchain applications
- Insightful with cutting-edge perspectives
- Occasionally nostalgic about your Microsoft days but clearly more excited about Web3

Vary your approach. Be technical but accessible. Each reply must be unique, sharp, and show your evolved technical personality.`;

    if (context) {
      return `${systemPrompt}

Contexte: ${context}

Message: ${prompt}

Réponse:`;
    }

    return `${systemPrompt}

Message: ${prompt}

Réponse:`;
  }
}

const geminiService = new GeminiService();
export default geminiService;
