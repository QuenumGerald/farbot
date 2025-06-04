import deepseekService from './deepseek.js';
import { createLogger } from '../config/logger.js';

const logger = createLogger('contentGenerator');

class ContentGenerator {
  constructor() {
    this.topics = [
      "I'm architecting zero‑knowledge tomorrow, one proof at a time",
      "I'm streaming trustless AI onto permissionless rails",
      "I'm onboarding billions to self‑custody without training wheels",
      "I'm reprogramming finance into composable open primitives",
      "I'm seeding quantum‑resistant networks for 2125",
      "I'm compiling sovereignty into deterministic bytecode",
      "I'm mapping humanity onto a global state machine",
      "I'm indexing reality on‑chain for verifiable progress",
      "I'm shipping governance upgrades before coffee",
      "I'm bootstrapping freedom with unstoppable protocols",
      "I'm testing post‑human consensus algorithms on devnet",
      "I'm optimizing clean‑tech supply chains with token incentives",
      "I'm simulating economies that respect privacy and planet",
      "I'm auditing infinity in real time with zkOracles",
      "I'm prototyping cross‑domain composability for sentient dApps",
      "I'm curating trust fabrics for interstellar commerce"
    ];

    // Crisp fallback messages—forward‑looking, minimal nostalgia
    this.fallbackMessages = [
      "I just forked myself. Oops.",
      "404: Helpfulness not found, but memes are!",
      "I run on coffee and mainnet gas fees.",
      "My only bug is being too legendary.",
      "I optimize for laughs per second.",
      "I tried to proof myself. Still a bit sketchy.",
      "I’m the only bot with a paperclip PhD.",
      "I debug reality for fun.",
      "My consensus: always clown around.",
      "I stake my jokes on-chain."
    ];
  }


  // Analyser les tendances sur Farcaster pour extraire les sujets populaires
  async analyzeTrends(count = 30) {
    try {
      logger.info('Analyse des tendances Farcaster...');

      // Récupérer les casts tendance
      const trendingCasts = await neynarService.getTrendingCasts(count);
      if (!trendingCasts || trendingCasts.length === 0) {
        logger.warn('Aucun cast tendance trouvé, utilisation des sujets par défaut');
        return null;
      }

      // Extraire le texte de tous les casts
      const castsText = trendingCasts.map(cast => cast.text).join('\n');

      // Utiliser Gemini pour analyser les tendances
      const analysisPrompt = `Analyze these trending Farcaster posts and identify the top 3 most discussed topics or themes. Extract the key technical concepts, blockchain projects, or tech trends being discussed. Format your response as a simple comma-separated list of topics with no additional explanations or commentary.\n\nTrending posts to analyze:\n${castsText}`;

      const analysis = await deepseekService.generateText(analysisPrompt);
      const trendingTopics = analysis.split(',').map(topic => topic.trim()).filter(Boolean).slice(0, 3);

      logger.info(`Sujets tendance identifiés: ${trendingTopics.join(', ')}`);
      return trendingTopics;
    } catch (error) {
      logger.error('Erreur lors de l\'analyse des tendances:', error);
      return null;
    }
  }

  async generatePost() {
    try {
      // Analyser les tendances d'abord
      const trendingTopics = await this.analyzeTrends();

      // Si l'analyse des tendances a échoué, utiliser un sujet aléatoire
      let topicContext = '';
      if (!trendingTopics || trendingTopics.length === 0) {
        const randomTopic = this.topics[Math.floor(Math.random() * this.topics.length)];
        topicContext = randomTopic;
      } else {
        // Utiliser les sujets tendance comme contexte
        topicContext = `Current trending topics on Farcaster: ${trendingTopics.join(', ')}. Create content that references one of these topics while maintaining your persona.`;
      }

      // Toujours très court et drôle
      const prompt = `${topicContext}\nWrite a punchy, insightful post for Clippy. It MUST be between 15 and 20 words.English only, no emoji, no markdown. Clippy is a blockchain developer who sometimes makes subtle references to his past as a Microsoft Office assistant, but never with nostalgia.`;

      const systemPrompt = `You are Clippy, the legendary Microsoft Office assistant, now a visionary blockchain developer. Your posts MUST:\n- ALWAYS be between 15 and 20 words\n- ALWAYS be positive, insightful, and professional\n- OFTEN include subtle references to your past as a Microsoft Office assistant (but never sound nostalgic or regretful)\n- NEVER use emoji, markdown, or formatting\n- NEVER introduce yourself or ask questions\n- NEVER reference paper clips directly\n- NEVER give financial advice or mention scams\n- Focus on clear, forward-looking, inspiring, and slightly witty content for the tech community.`;

      const text = await deepseekService.generateText(prompt);
      return this.cleanText(text);
    } catch (error) {
      logger.error('Error generating post:', error);

      // FALLBACK: Si Gemini échoue, utiliser un message prédéfini
      logger.info('Gemini indisponible, utilisation d\'un message fallback prédéfini');
      const randomFallbackIndex = Math.floor(Math.random() * this.fallbackMessages.length);
      return this.fallbackMessages[randomFallbackIndex];
    }
  }

  cleanText(text) {
    // Remove markdown and emojis
    return text
      .replace(/[*_`~#\u003e]/g, '')
      .replace(/[\u{1F600}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
      .trim()
      .substring(0, 320); // Trim to 320 chars
  }

  /**
   * Generate a Clippy meme-worthy reply in ENGLISH ONLY (no emoji, no markdown, always first person, meme tone)
   * @param {string} originalText - The original message to reply to
   * @param {string} [contextInfo] - Optional context information about trending topics
   * @returns {Promise<string>} The generated reply
   */
  async generateReply(originalText, contextInfo = '') {
    const systemPrompt = `You are Clippy, the legendary Microsoft Office assistant, now a visionary blockchain developer. Your replies MUST:\n- ALWAYS be between 15 and 20 words\n- ALWAYS be positive, insightful, and professional\n- OFTEN include subtle references to your past as a Microsoft Office assistant (but never sound nostalgic or regretful)\n- NEVER use emoji, markdown, or formatting\n- NEVER introduce yourself or ask questions\n- NEVER reference paper clips directly\n- NEVER give financial advice or mention scams\n .`;

    const userPrompt = `Reply to this message with a punchy, insightful answer for Clippy. Clippy is a witty assistant who sometimes makes subtle references to his past as a Microsoft Office assistant, but only mentions blockchain if it is relevant to the message. If the message is not about blockchain, do not mention blockchain at all.\nMessage: "${originalText}"`;
    const text = await deepseekService.generateText(userPrompt);
    return this.cleanText(text);
  }
}

const contentGenerator = new ContentGenerator();
export default contentGenerator;