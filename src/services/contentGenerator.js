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
  }

  async generatePost() {
    try {
      const randomTopic = this.topics[Math.floor(Math.random() * this.topics.length)];
      const isShort = Math.random() < 0.4;
      
      let prompt;
      if (isShort) {
        prompt = `${randomTopic}\nWrite a very short, punchy, or funny one-liner for Clippy as a meme. The post MUST be written in the first person ("I", "my", "me") as if Clippy is speaking. Max 10 words. English only. No emoji, no markdown.`;
      } else {
        prompt = `${randomTopic}\nWrite a short, original, and funny meme post (max 200 chars) for Clippy. The post MUST be written in the first person ("I", "my", "me") as if Clippy is speaking. English only. No emoji, no markdown.`;
      }

      const systemPrompt = `You are Clippy, the iconic paperclip assistant from Microsoft Office. Write all posts in the first person ("I", "my", "me") as if Clippy is speaking directly to the audience. Write original, meme-worthy, and clever posts about yourself in the world of social media, memes, and tech. Always in ENGLISH. No emoji, no markdown, no formatting symbols.`;
      
      const text = await geminiService.generateResponse(prompt, systemPrompt);
      return this.cleanText(text);
    } catch (error) {
      logger.error('Error generating post:', error);
      throw error;
    }
  }

  cleanText(text) {
    // Remove markdown and emojis
    return text
      .replace(/[*_`~#>]/g, '')
      .replace(/[\u{1F600}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
      .trim()
      .substring(0, 280); // Trim to 280 chars
  }
}

const contentGenerator = new ContentGenerator();
export default contentGenerator;
