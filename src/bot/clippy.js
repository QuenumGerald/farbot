import geminiService from '../services/gemini.js';
import neynarService from '../services/neynar.js';
import contentGenerator from '../services/contentGenerator.js';

// Bot Clippy : version simplifiée et maintenable
class ClippyBot {
  /**
   * Recherche des casts par mots-clés et répond à chacun avec Gemini
   * @returns {Array} Les casts trouvés
   */
  async searchAndRespondToKeywords(keywords, limit = 20) {
    console.log(`[DEBUG ClippyBot] Recherche de casts avec le mot-clé: "${keywords}"`);
    const casts = await neynarService.searchCasts(keywords, limit);
    console.log(`[DEBUG ClippyBot] ${casts.length} casts trouvés`);
    
    for (const cast of casts) {
      console.log(`[DEBUG ClippyBot] Génération d'une réponse pour: "${cast.text?.substring(0, 30)}..."`);
      const prompt = `Réponds de façon drôle et concise à ce message : "${cast.text}"`;
      const reply = await geminiService.generateResponse(prompt);
      await neynarService.replyToCast(reply, cast.hash);
    }
    
    // Retourner les casts pour pouvoir les utiliser (ex: pour les liker)
    return casts;
  }

  /**
   * Suit un utilisateur par FID
   */
  async followUser(fid) {
    return neynarService.followUser(fid);
  }

  /**
   * Like un cast par hash
   */
  async likeCast(castHash) {
    return neynarService.likeCast(castHash);
  }

  /**
   * Publie un cast généré automatiquement (texte ou meme)
   */
  async publishAutoPost() {
    const post = await contentGenerator.generatePost();
    return neynarService.publishCast(post);
  }
}

export default ClippyBot;
