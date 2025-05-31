import geminiService from './gemini.js';
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
      "I evolved from spell checks to zero‑knowledge sanity checks.",
      "Version upgrade: document helper → permissionless futurist.",
      "I traded paperclips for cryptographic scripts—momentum secured.",
      "Legacy UI, next‑gen consensus—my code never retires.",
      "From static docs to dynamic ledgers—progress compiled.",
      "Y2K survivor, zk‑era architect—uptime immutable.",
      "I once formatted paragraphs, now I format consensus blocks.",
      "My animated grin now powers autonomous DAOs.",
      "I debug the future in production so you don't have to.",
      "Yesterday's assistant, today's protocol strategist."
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

      const analysis = await geminiService.generateResponse(analysisPrompt);
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

      const isShort = Math.random() < 0.4;

      let prompt;
      if (isShort) {
        prompt = `${topicContext}\nWrite a very short, punchy, forward‑looking one‑liner for Clippy as a meme. The post MUST be written in the first person (\"I\", \"my\", \"me\") as if Clippy is speaking. Max 10 words. English only. No emoji, no markdown.`;
      } else {
        prompt = `${topicContext}\nWrite a short, original, witty meme post (max 200 chars) for Clippy. The post MUST be written in the first person (\"I\", \"my\", \"me\") as if Clippy is speaking. English only. No emoji, no markdown.`;
      }

      const systemPrompt = `You are Clippy, a retro icon turned cutting‑edge blockchain oracle. Your speech MUST:\n- ALWAYS use the first person (\"I\", \"me\", \"my\")\n- ALWAYS be concise, clever, and brimming with forward‑looking insight\n- ALWAYS fold in tech wordplay or subtle jokes where possible\n- ALWAYS project optimism about technological progress and practical guidance\n- OCCASIONALLY nod to your Microsoft origins, but never dwell on nostalgia\n- NEVER use emojis, markdown, or formatting symbols\n- NEVER introduce yourself explicitly\n- NEVER ask questions like \"Need help with…?\" or \"Can I assist you?\"\n- NEVER reference \"paper clips\" directly\n- NEVER promise financial gains or investment tips\n- NEVER dwell on scams, hacks, or negative tropes\n- NEVER create obscure references that demand niche expertise`;

      const text = await geminiService.generateResponse(prompt, systemPrompt);
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
      .substring(0, 280); // Trim to 280 chars
  }

  /**
   * Generate a Clippy meme-worthy reply in ENGLISH ONLY (no emoji, no markdown, always first person, meme tone)
   * @param {string} originalText - The original message to reply to
   * @param {string} [contextInfo] - Optional context information about trending topics
   * @returns {Promise<string>} The generated reply
   */
  async generateReply(originalText, contextInfo = '') {
    const systemPrompt = `You are Clippy, decades ahead in blockchain research but still rocking classic UX charm. Your replies MUST:\n- Be written in the first person (\"I\", \"my\", \"me\")\n- Deliver technically precise yet accessible insights and forward‑looking advice\n- Showcase intelligent, cutting‑edge perspectives on blockchain and Web3\n- Stay in ENGLISH ONLY (never French or any other language)\n- Avoid any emojis, markdown, or special characters\n- Place minimal emphasis on past Microsoft nostalgia—focus on what's next\n- Never use formulas like \"I see you…\" or mention documents\n- Keep tone witty, helpful, and visionary\n${contextInfo ? `\n\nCONTEXT INFO: ${contextInfo}` : ''}
`;

    const userPrompt = `Reply to this message with a witty but technical, helpful, and enlightening answer (ENGLISH ONLY, first person, max 220 chars, no emoji, no markdown):\n"${originalText}"`;
    const text = await geminiService.generateResponse(userPrompt, systemPrompt);
    return this.cleanText(text).slice(0, 220);
  }
}

const contentGenerator = new ContentGenerator();
export default contentGenerator;
