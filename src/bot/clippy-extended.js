import geminiService from '../services/gemini.js';
import neynarService from '../services/neynar.js';
import contentGenerator from '../services/contentGenerator.js';

/**
 * Bot Clippy étendu pour la planification avancée
 * Ajoute :
 *   - Publication de plusieurs posts quotidiens
 *   - Réponse automatique aux mentions
 *   - Suivi automatique d'utilisateurs
 *   - Like automatique de posts
 */
class ClippyBotExtended {
  /**
   * Recherche des casts par mots-clés et répond à chacun avec Gemini
   * @returns {Array} Les casts trouvés
   */
  async searchAndRespondToKeywords(keywords, limit = 20) {
    // Obtenir les casts correspondant aux mots-clés
    const casts = await neynarService.searchCasts(keywords, limit);
    if (casts.length === 0) return [];
    
    // Analyser les tendances pour avoir du contexte supplémentaire
    let contextInfo = '';
    try {
      const trendingTopics = await contentGenerator.analyzeTrends(10);
      if (trendingTopics && trendingTopics.length > 0) {
        contextInfo = `Current trending topics on Farcaster: ${trendingTopics.join(', ')}. If relevant to the user's message, you can reference these topics in your response.`;
      }
    } catch (error) {
      console.error('Erreur lors de l\'analyse des tendances pour les réponses:', error);
      // Continue même si l'analyse des tendances échoue
    }
    
    // Sélectionne un cast au hasard
    const randomCast = casts[Math.floor(Math.random() * casts.length)];
    
    // Générer une réponse plus contextuelle
    let reply;
    
    // Si on a du contexte des tendances, l'utiliser
    if (contextInfo) {
      // Générer une réponse basée sur le contexte et le message
      reply = await contentGenerator.generateReply(randomCast.text, contextInfo);
    } else {
      // Fallback sur la méthode standard sans contexte
      reply = await contentGenerator.generateReply(randomCast.text);
    }
    
    // Publier la réponse
    await neynarService.replyToCast(reply, randomCast.hash);
    
    // Log pour le débogage
    console.log(`[ClippyBot] Réponse générée pour le cast: "${randomCast.text?.substring(0, 30)}..."`);
    console.log(`[ClippyBot] Réponse: "${reply}"`);
    
    return [randomCast];
  }

  /**
   * Publie 3 posts générés par Gemini (texte ou image)
   * @param {Object} opts
   * @param {boolean} opts.withImage
   * @param {string} opts.theme
   * @param {string} opts.contentType
   */
  /**
   * Publie UN SEUL post généré par Gemini (texte uniquement)
   * @param {Object} opts
   * @param {string} opts.theme - Thème du post
   */
  async publishDailyContent({ theme = 'general' } = {}) {
    // Générer UN SEUL post (jamais plus)
    const post = await contentGenerator.generatePost(theme);
    await neynarService.publishCast(post);
    return post;
  }

  /**
   * Like jusqu'à N casts pertinents
   * @param {number} limit
   * @param {Array<string>} keywords
   */
  async likeRecentCasts(limit = 10, keywords = []) {
    let liked = 0;
    const casts = await neynarService.searchCasts(keywords, limit);
    for (const cast of casts) {
      try {
        await neynarService.likeCast(cast.hash);
        liked++;
      } catch (e) { /* ignore */ }
    }
    return liked;
  }

  /**
   * Suit jusqu'à N nouveaux utilisateurs pertinents
   * @param {number} count
   */
  /**
   * Suit jusqu'à N nouveaux utilisateurs pertinents trouvés via les mots-clés
   * @param {number} count
   * @param {Array<string>} keywords (optionnel)
   */
  async followRelevantUsers(count = 30, keywords = null) {
    // Import dynamique des mots-clés si non fournis
    if (!keywords) {
      try {
        // eslint-disable-next-line no-undef
        keywords = (await import('../jobs/scheduler.js')).KEYWORDS;
      } catch (e) {
        console.error('[ClippyBot] Impossible de charger les mots-clés depuis scheduler.js', e);
        keywords = ['blockchain', 'bitcoin', 'ethereum', 'clippy']; // fallback minimal
      }
    }
    let followed = 0;
    const fids = new Set();
    const triedFids = new Set();
    // Pour éviter les doublons et accélérer, on collecte les casts pour tous les mots-clés
    for (const keyword of keywords) {
      if (followed >= count) break;
      let casts = [];
      try {
        casts = await neynarService.searchCasts(keyword, 10);
      } catch (e) {
        console.error(`[ClippyBot] Erreur lors de la recherche de casts pour le mot-clé: ${keyword}`, e);
        continue;
      }
      for (const cast of casts) {
        const fid = cast.author?.fid;
        if (!fid || fids.has(fid) || triedFids.has(fid)) continue;
        triedFids.add(fid);
        let alreadyFollowing = false;
        try {
          alreadyFollowing = await neynarService.checkIfFollowing(fid);
        } catch (e) {
          console.error(`[ClippyBot] Erreur lors de la vérification du follow pour FID ${fid}:`, e);
        }
        if (!alreadyFollowing) {
          try {
            await neynarService.followUser(fid);
            fids.add(fid);
            followed++;
            console.log(`[ClippyBot] ✅ Suivi de l'utilisateur FID: ${fid}`);
            if (followed >= count) break;
          } catch (e) {
            console.error(`[ClippyBot] ❌ Erreur lors du follow de FID ${fid}:`, e);
          }
        } else {
          //console.log(`[ClippyBot] Déjà suivi: ${fid}`);
        }
      }
    }
    return followed;
  }

  /**
   * Répond à toutes les mentions récentes
   * @param {number} limit
   */
  async replyToMentions(limit = 10) {
    const mentions = await neynarService.getMentions(limit);
    let replied = 0;
    for (const mention of mentions) {
      try {
        const prompt = `Reply : "${mention.text}"`;
        const reply = await geminiService.generateResponse(prompt);
        await neynarService.replyToCast(reply, mention.hash);
        replied++;
      } catch (e) { /* ignore */ }
    }
    return replied;
  }
}

export default ClippyBotExtended;
