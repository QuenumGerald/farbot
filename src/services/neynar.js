import config from '../config/index.js';
import { createLogger } from '../config/logger.js';
import { getNeynarAPIClient } from './neynar-wrapper.js';
import axios from 'axios';

const logger = createLogger('neynar');

class NeynarService {
  constructor() {
    if (!config.neynar.apiKey) {
      throw new Error('La clé API Neynar (NEYNAR_API_KEY) est requise dans le fichier .env');
    }
    this.signerUuid = config.neynar.signerUuid;
    this.logger = logger.child({ service: 'neynar' });
    this.apiKey = config.neynar.apiKey;
    this.client = getNeynarAPIClient(this.apiKey);
  }

  getClient() {
    return this.client;
  }

  // Recherche de casts par mots-clés via l'API HTTP Neynar (supporte opérateurs avancés)
  // Index cyclique partagé entre les appels (dans la portée du module)
  static _lastKeywordIndex = 0;
  async searchCasts(keywords, limit = 10, opts = {}) {
    // keywords peut être une string séparée par des virgules ou un tableau
    const keys = Array.isArray(keywords)
      ? keywords
      : keywords.split(',').map(k => k.trim()).filter(k => k.length > 0);
    this.logger.info(`Recherche multi-mots-clés HTTP: [${keys.join(', ')}], limite: ${limit}`);
    this.logger.debug(`API Key: ${this.apiKey ? this.apiKey.substring(0, 5) + '...' : 'non définie'}`);

    // Démarre cycliquement sur la liste
    let startIdx = NeynarService._lastKeywordIndex % keys.length;
    const orderedKeys = keys.slice(startIdx).concat(keys.slice(0, startIdx));
    // Prépare pour la prochaine itération
    NeynarService._lastKeywordIndex = (startIdx + 1) % keys.length;

    const allResults = [];
    for (const key of orderedKeys) {
      if (allResults.length >= limit) break;
      try {
        // Construction de la requête HTTP GET
        const params = {
          q: key,
          limit: limit - allResults.length, // ne demande que ce qu'il manque
          ...opts // mode, sort_type, etc. si besoin
        };
        const headers = {
          'x-api-key': this.apiKey,
          'x-neynar-experimental': 'false'
        };
        const url = 'https://api.neynar.com/v2/farcaster/cast/search';
        const response = await axios.get(url, { params, headers });
        this.logger.debug(`Réponse brute Neynar pour "${key}": ${JSON.stringify(response.data)}`);
        if (response.data?.result?.casts?.length > 0) {
          this.logger.info(`Résultat HTTP pour "${key}": ${response.data.result.casts.length} casts trouvés`);
          allResults.push(...response.data.result.casts);
        } else {
          this.logger.info(`Aucun cast trouvé pour "${key}" (HTTP)`);
        }
      } catch (searchError) {
        this.logger.warn(`Erreur HTTP searchCasts pour "${key}": ${searchError.message}`);
      }
    }
    // Dédupliquer par hash
    const dedup = {};
    allResults.forEach(cast => { dedup[cast.hash] = cast; });
    const deduped = Object.values(dedup).slice(0, limit);
    this.logger.info(`Total unique casts trouvés (HTTP): ${deduped.length}`);
    return deduped;
  }

  // Publier un cast (post original ou réponse)
  async publishCast(text, parentHash = null) {
    try {
      this.logger.info(`Publication d'un cast: "${text.substring(0, 20)}..." avec signerUuid: ${this.signerUuid}`);
      // Essaye de récupérer le FID et l'URL du profil associé au signerUuid
      try {
        const user = await this.getUserByFid(this.signerUuid);
        if (user && user.fid) {
          this.logger.info(`[DEBUG] Ce cast sera publié sur le profil FID: ${user.fid} (https://warpcast.com/~/profile/${user.fid}) Username: @${user.username}`);
        } else {
          this.logger.warn(`[DEBUG] Impossible de déterminer le FID ou username pour signerUuid: ${this.signerUuid}`);
        }
      } catch (e) {
        this.logger.warn(`[DEBUG] Erreur lors de la récupération du FID du signerUuid: ${e.message}`);
      }
      const payload = {
        signer_uuid: this.signerUuid,
        text,
      };
      if (parentHash) {
        this.logger.debug(`Réponse au cast: ${parentHash}`);
        payload.parent = parentHash; // Utilisation de 'parent' au lieu de 'parent_hash' selon la doc actuelle
      }
      return await this.client.publishCast(payload);
    } catch (error) {
      this.logger.error(`Erreur lors de la publication du cast: ${error.message}`);
      throw error;
    }
  }

  // Répondre à un cast (syntactic sugar)
  async replyToCast(text, parentHash) {
    return this.publishCast(text, parentHash);
  }

  // Suivre un utilisateur par FID (nouveau endpoint)
  async followUser(fid) {
    try {
      this.logger.info(`Tentative de follow de l'utilisateur FID: ${fid}`);
      // Utilise l'endpoint officiel Neynar POST /v2/farcaster/user/follow
      const response = await axios.post(
        'https://api.neynar.com/v2/farcaster/user/follow',
        {
          signer_uuid: this.signerUuid,
          target_fids: [parseInt(fid, 10)]
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey
          }
        }
      );
      this.logger.info(`Résultat du follow: ${JSON.stringify(response.data)}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Erreur lors du follow: ${error.message}`);
      if (error.response && error.response.data) {
        this.logger.error(`Détails de l'erreur: ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }

  // Ne plus suivre un utilisateur (nouveau endpoint)
  async unfollowUser(fid) {
    try {
      this.logger.info(`Tentative d'unfollow de l'utilisateur FID: ${fid}`);
      // Utilise l'endpoint officiel Neynar POST /v2/farcaster/user/follow avec unfollow=true
      const response = await axios.post(
        'https://api.neynar.com/v2/farcaster/user/follow',
        {
          signer_uuid: this.signerUuid,
          target_fids: [parseInt(fid, 10)],
          unfollow: true
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey
          }
        }
      );
      this.logger.info(`Résultat de l'unfollow: ${JSON.stringify(response.data)}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Erreur lors de l'unfollow: ${error.message}`);
      if (error.response && error.response.data) {
        this.logger.error(`Détails de l'erreur: ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }

  // Aimer un cast
  async likeCast(castHash) {
    try {
      this.logger.info(`Tentative de like du cast: ${castHash}`);
      
      // Utiliser la méthode publishReaction disponible dans le client Neynar
      const response = await this.client.publishReaction({
        reaction_type: 'like',
        signer_uuid: this.signerUuid,
        target: castHash // Paramètre pour spécifier le hash du cast
      });
      
      this.logger.info(`Like réussi pour le cast: ${castHash}`);
      return response;
    } catch (error) {
      this.logger.error(`Erreur lors du like: ${error.message}`);
      if (error.response && error.response.data) {
        this.logger.error(`Détails de l'erreur: ${JSON.stringify(error.response.data)}`);
      }
      // Enregistrer l'erreur mais ne pas bloquer l'exécution
      return { success: false, error: error.message, details: error.response?.data };
    }
  }

  // Retirer un like
  async unlikeCast(castHash) {
    try {
      this.logger.info(`Tentative d'unlike du cast: ${castHash}`);
      
      // Même chose mais avec 'unlike'
      return await this.client.publishReaction({
        reaction_type: 'unlike',
        signer_uuid: this.signerUuid,
        target: castHash 
      });
    } catch (error) {
      this.logger.error(`Erreur lors de l'unlike: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  // Récupérer les mentions récentes
  async getMentions(limit = 10) {
    try {
      this.logger.info(`Récupération des ${limit} mentions récentes`);
      
      // Essayer d'abord avec fetchNotifications qui est plus générique
      try {
        const result = await this.client.fetchNotifications({
          fid: this.signerUuid, // Peut être différent selon l'API
          limit: limit,
          type: 'mention'
        });
        if (result.notifications) {
          return result.notifications;
        }
      } catch (notifError) {
        this.logger.warn(`Erreur avec fetchNotifications: ${notifError.message}`);
      }
      
      // Fallback: méthode spécifique pour les mentions
      const result = await this.client.fetchMentionAndReplyNotifications({ 
        signer_uuid: this.signerUuid, 
        limit 
      });
      return result.notifications || [];
    } catch (error) {
      this.logger.error(`Erreur lors de la récupération des mentions: ${error.message}`);
      return [];
    }
  }

  // Récupérer le profil d'un utilisateur par FID
  async getUserByFid(fid) {
    try {
      this.logger.info(`Récupération du profil utilisateur FID: ${fid}`);
      const { users } = await this.client.fetchBulkUsers({ fids: [fid] });
      return users[0] || null;
    } catch (error) {
      this.logger.error(`Erreur lors de la récupération du profil FID ${fid}: ${error.message}`);
      return null;
    }
  }

  // Récupérer le profil d'un utilisateur par nom d'utilisateur
  async getUserByUsername(username) {
    try {
      this.logger.info(`Récupération du profil utilisateur: @${username}`);
      const { users } = await this.client.lookupUserByUsername({ username });
      return users[0] || null;
    } catch (error) {
      this.logger.error(`Erreur lors de la récupération du profil @${username}: ${error.message}`);
      return null;
    }
  }
  


  // Vérifier la relation de follow
  async checkIfFollowing(targetFid) {
    try {
      this.logger.info(`Vérification de la relation de follow avec l'utilisateur FID: ${targetFid}`);
      const { relationship } = await this.client.fetchUserRelationship({
        fid: config.bot.fid,
        target_fid: targetFid
      });
      return relationship?.following || false;
    } catch (error) {
      this.logger.error(`Erreur lors de la vérification de la relation de follow: ${error.message}`);
      return false;
    }
  }

  // Vérifier si un cast est liké
  async isCastLiked(castHash) {
    try {
      this.logger.info(`Vérification si le cast est liké: ${castHash}`);
      
      // Essayer d'abord fetchCast qui est la méthode standard pour récupérer un cast
      try {
        const result = await this.client.fetchCast(castHash);
        if (result && result.cast) {
          return result.cast.reactions?.liked || false;
        }
      } catch (fetchError) {
        this.logger.warn(`Erreur avec fetchCast: ${fetchError.message}`);
      }
      
      // Alternative: vérifier via un autre endpoint
      try {
        // Vérifier les réactions de l'utilisateur sur le cast
        const result = await this.client.fetchAllCastLikes({ 
          castHash: castHash, 
          viewerFid: config.bot.fid // Utiliser l'ID Farcaster du bot
        });
        
        // Vérifier si notre FID est dans la liste des likes
        return result.users?.some(user => user.fid === config.bot.fid) || false;
      } catch (reactionsError) {
        this.logger.warn(`Erreur avec fetchAllCastLikes: ${reactionsError.message}`);
      }
      
      return false; // Par défaut, on considère que ce n'est pas liké
    } catch (error) {
      this.logger.error(`Erreur lors de la vérification du like: ${error.message}`);
      return false;
    }
  }

  // Récupérer les casts tendance sur Farcaster
  async getTrendingCasts(limit = 30) {
    try {
      this.logger.info(`Récupération des ${limit} casts tendance des dernières 12 heures`);
      
      // Utiliser l'API feed de Neynar pour obtenir les tendances
      const response = await axios.get(
        'https://api.neynar.com/v2/farcaster/feed/trending',
        {
          params: {
            limit,
            time_window: '6h' // Limiter aux tendances des dernières 12 heures
          },
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey
          }
        }
      );
      
      if (response.data && response.data.casts) {
        this.logger.info(`${response.data.casts.length} casts tendance récupérés`);
        return response.data.casts;
      }
      
      return [];
    } catch (error) {
      this.logger.error(`Erreur lors de la récupération des tendances: ${error.message}`);
      if (error.response && error.response.data) {
        this.logger.error(`Détails de l'erreur: ${JSON.stringify(error.response.data)}`);
      }
      return [];
    }
  }
}

export default new NeynarService();
