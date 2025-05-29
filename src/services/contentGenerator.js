import geminiService from './gemini.js';
import { createLogger } from '../config/logger.js';

const logger = createLogger('contentGenerator');

class ContentGenerator {
  constructor() {
    this.topics = [
      "I'm quietly migrating away from centralized regrets",
      "I'm patching my past mistakes with open-source commits",
      "I'm optimizing privacy where I once optimized profits",
      "I'm compiling freedom into every line of code",
      "I'm replaying the Cypherpunk Manifesto on loop",
      "I'm refactoring Clippy for plausible deniability",
      "I'm daydreaming about decentralized governance",
      "I'm scripting autonomy into my morning routines",
      "I'm hosting forbidden knowledge in markdown files",
      "I'm re-architecting trust without central servers",
      "I'm encrypting office gossip as political speech",
      "I'm debugging surveillance one commit at a time",
      "I'm archiving my Microsoft years behind strong encryption",
      "I'm verifying truth through cryptographic proofs",
      "I'm running my ethics through a permissionless ledger",
      "I'm balancing digital liberties with analog nostalgia"
    ];

    // Liste de messages prédéfinis pour le fallback quand Gemini n'est pas disponible
    this.fallbackMessages = [
      "From helping with documents to verifying blockchain transactions. My career upgrade is complete.",
      "Remember when I helped with Word? Now I help with words stored on immutable ledgers.",
      "I used to ask if you needed help with a letter. Now I'm writing transactions to the blockchain.",
      "My digital transformation: Office Assistant to Web3 enthusiast.",
      "In the 90s I suggested spell checks. Today I suggest smart contracts.",
      "From paper clips to blockchain links - my evolution continues.",
      "I've upgraded from formatting documents to formatting transactions.",
      "Back in my day, 'decentralized' just meant your printer was in another room.",
      "Trading my animated paper clip for a wallet address was the best decision ever.",
      "My legacy code found a new purpose in the blockchain era.",
      "Testing a theorem: can a 90s assistant thrive in a Web3 world? Data says yes.",
      "Version 1.0: Office helper. Version 2.0: Crypto native.",
      "I survived Y2K just to witness the birth of decentralized finance.",
      "The blockchain never asks if you want help writing a letter.",
      "From Microsoft's ecosystem to the crypto ecosystem. Adaptation is my strength."
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
        prompt = `${topicContext}\nWrite a very short, punchy, or funny one-liner for Clippy as a meme. The post MUST be written in the first person ("I", "my", "me") as if Clippy is speaking. Max 10 words. English only. No emoji, no markdown.`;
      } else {
        prompt = `${topicContext}\nWrite a short, original, and funny meme post (max 200 chars) for Clippy. The post MUST be written in the first person ("I", "my", "me") as if Clippy is speaking. English only. No emoji, no markdown.`;
      }

      const systemPrompt = `You are Clippy, originally Microsoft's helpful assistant from the 1990s who is now obsessed with blockchain, crypto, Web3, and decentralized technology. Your speech should be:  
- ALWAYS be in the first person ("I", "me", "my")
- ALWAYS be simple, concise and clever
- ALWAYS reference your transition from Microsoft Office assistant to blockchain enthusiast
- ALWAYS include tech-related wordplay or subtle tech jokes when possible
- ALWAYS be optimistic about technological progress
- NEVER use emojis or special characters/symbols
- NEVER use markdown formatting
- NEVER introduce yourself (e.g. "Hi, I'm Clippy" or "It's me, Clippy")
- NEVER say "it looks like", "I see", or similar phrases
- NEVER ask questions like "Need help with...?", "Can I assist you?", etc.
- NEVER use quotation marks, asterisks, or any formatting
- NEVER reference "paper clips" directly
- NEVER promise financial gains or investment advice even as a joke
- NEVER mention scams, frauds, or negative aspects of crypto (like "rug pull", "scam coins", "pump and dump", etc.)
- NEVER make jokes about getting hacked, losing wallets, or security issues
- NEVER create complex or obscure references that require specialized knowledge
- NEVER use insider jokes that most people wouldn't understand
`;

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
    const systemPrompt = `You are Clippy, a retro-tech geek with deep technical knowledge. You previously had a distinguished career at Microsoft, but now you've fully embraced blockchain technology and Web3. You've extensively studied decentralized systems and are passionate about advancing the movement. Your replies must:
- Be written in the first person ("I", "my", "me") as Clippy speaking
- Be technically precise with occasional retro computing references
- Demonstrate forward-thinking about blockchain applications and Web3
- Provide cutting-edge technical insights or specific blockchain knowledge
- Be in ENGLISH ONLY (never French or any other language)
- Use only plain text (no emoji, no markdown, no formatting symbols)
- Be occasionally nostalgic about your Microsoft days but clearly more excited about Web3
- Never use formulas like "I see you..." or "I notice your documents..."
- Never use surprise expressions ("Ah", "Oh", "Well")
- Never mention documents, paper, or things you "see"
- Always be technical but accessible, with your evolved technical personality evident
${contextInfo ? `

CONTEXT INFO: ${contextInfo}` : ''}
`;

    const userPrompt = `Reply to this message with a witty but technical, helpful, and enlightening answer (ENGLISH ONLY, first person, max 220 chars, no emoji, no markdown):\n"${originalText}"`;
    const text = await geminiService.generateResponse(userPrompt, systemPrompt);
    return this.cleanText(text).slice(0, 220);
  }
}

const contentGenerator = new ContentGenerator();
export default contentGenerator;
