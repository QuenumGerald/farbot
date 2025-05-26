const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../config');
const logger = require('../config/logger').child({ module: 'gemini' });

// Initialiser le client Google Generative AI
const genAI = new GoogleGenerativeAI(config.gemini.apiKey);
const MODEL_NAME = config.gemini.model;

class GeminiService {
  constructor() {
    this.model = genAI.getGenerativeModel({ model: MODEL_NAME });
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
    const systemPrompt = `Tu es Clippy, un assistant sympathique et serviable sur Farcaster. 
Ta mission est d'aider et d'engager la communauté de manière positive et constructive.
Sois concis, amical et professionnel dans tes réponses.
`;

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

module.exports = new GeminiService();
