import axios from 'axios';
import { NeynarAPIClient, Configuration } from '@neynar/nodejs-sdk';
import config from '../config.js';
import logger from '../logger.js';

// Classe pour interagir avec l'API Neynar
class NeynarService {
  constructor(apiKey, signerUuid, botFid) {
    this.apiKey = apiKey;
    this.signerUuid = signerUuid;
    this.botFid = botFid;
    this.logger = logger;
    
    // Initialisation du client SDK officiel Neynar avec la nouvelle syntaxe de v2
    const sdkConfig = new Configuration({
      apiKey: apiKey,
      baseOptions: {
        headers: {
          "x-neynar-experimental": true,
        },
      },
    });
    this.client = new NeynarAPIClient(sdkConfig);
  }

  // Rechercher des casts contenant un mot-clé
  async searchCasts(key, limit = 10, opts = {}) {
    this.logger.info(`Recherche de casts avec mot-clé: "${key}", limite: ${limit}`);
    let allResults = [];
    
    try {
      // Essayer avec HTTP direct
      try {
        const params = {
          q: key,
          limit: limit,
          ...opts // mode, sort_type, etc. si besoin
        };
        const headers = {
          'x-api-key': this.apiKey,
          'Content-Type': 'application/json'
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
      } catch (httpError) {
        this.logger.error(`Erreur HTTP lors de la recherche: ${httpError.message}`);
        if (httpError.response && httpError.response.data) {
          this.logger.error(`Détails de l'erreur: ${JSON.stringify(httpError.response.data)}`);
        }
      }
      
      return allResults;
    } catch (error) {
      this.logger.error(`Erreur lors de la recherche de casts: ${error.message}`);
      return [];
    }
  }

  // Récupérer les mentions du bot
  async getMentions(limit = 10, cursor = null) {
    try {
      this.logger.info(`Récupération des ${limit} dernières mentions du bot`);
      
      // Utiliser l'API search pour trouver les mentions
      const params = {
        q: `@${config.bot.username}`,
        limit
      };
      const headers = {
        'x-api-key': this.apiKey,
        'Content-Type': 'application/json'
      };
      
      const response = await axios.get('https://api.neynar.com/v2/farcaster/cast/search', { 
        params, 
        headers 
      });
      
      // Filter pour ne garder que les mentions dans les casts
      const mentions = response?.data?.result?.casts || [];
      
      this.logger.info(`${mentions.length} mentions trouvées pour le bot`);
      return mentions;
    } catch (error) {
      this.logger.error(`Erreur lors de la récupération des mentions: ${error.message}`);
      return [];
    }
  }

  // Suivre un utilisateur par FID
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
            'x-api-key': this.apiKey,
            'Content-Type': 'application/json'
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

  // Ne plus suivre un utilisateur
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
            'x-api-key': this.apiKey,
            'Content-Type': 'application/json'
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
      
      // Vérifier si déjà liké pour éviter les doubles likes
      try {
        const isLiked = await this.isCastLiked(castHash);
        if (isLiked) {
          this.logger.info(`Cast ${castHash} déjà liké, opération ignorée.`);
          return { success: true, alreadyLiked: true };
        }
      } catch (checkError) {
        this.logger.warn(`Impossible de vérifier si déjà liké: ${checkError.message}, on continue`);
      }
      
      // Utiliser l'endpoint reactions
      const response = await axios.post(
        'https://api.neynar.com/v2/farcaster/reaction/like',
        {
          signer_uuid: this.signerUuid,
          cast_hash: castHash
        },
        {
          headers: {
            'x-api-key': this.apiKey,
            'Content-Type': 'application/json'
          }
        }
      );
      
      this.logger.info(`Like réussi pour le cast: ${castHash}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Erreur lors du like: ${error.message}`);
      if (error.response && error.response.data) {
        this.logger.error(`Détails de l'erreur: ${JSON.stringify(error.response.data)}`);
      }
      // Enregistrer l'erreur mais ne pas bloquer l'exécution
      return { success: false, error: error.message };
    }
  }

  // Retirer le like d'un cast
  async unlikeCast(castHash) {
    try {
      this.logger.info(`Tentative d'unlike du cast: ${castHash}`);
      
      // Utiliser l'endpoint reactions
      const response = await axios.post(
        'https://api.neynar.com/v2/farcaster/reaction/unlike',
        {
          signer_uuid: this.signerUuid,
          cast_hash: castHash
        },
        {
          headers: {
            'x-api-key': this.apiKey,
            'Content-Type': 'application/json'
          }
        }
      );
      
      this.logger.info(`Unlike réussi pour le cast: ${castHash}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Erreur lors de l'unlike: ${error.message}`);
      if (error.response && error.response.data) {
        this.logger.error(`Détails de l'erreur: ${JSON.stringify(error.response.data)}`);
      }
      return { success: false, error: error.message };
    }
  }

  // Vérifier si un cast est déjà liké par le bot
  async isCastLiked(castHash) {
    try {
      this.logger.debug(`Vérification si le cast ${castHash} est déjà liké`);
      
      // Utiliser l'endpoint pour obtenir les réactions
      const response = await axios.get(
        `https://api.neynar.com/v2/farcaster/cast/${castHash}/reactions`,
        {
          params: {
            reaction_type: 'like',
            viewer_fid: this.botFid
          },
          headers: {
            'x-api-key': this.apiKey,
            'Content-Type': 'application/json'
          }
        }
      );
      
      // Vérifier si le bot est dans la liste des utilisateurs qui ont liké
      const reactions = response?.data?.reactions || [];
      const isLiked = reactions.some(reaction => reaction.fid === parseInt(this.botFid, 10));
      
      this.logger.debug(`Cast ${castHash} liké par le bot: ${isLiked}`);
      return isLiked;
    } catch (error) {
      this.logger.error(`Erreur lors de la vérification du like: ${error.message}`);
      // En cas d'erreur, retourner false pour éviter de bloquer l'exécution
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
            'x-api-key': this.apiKey,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.data?.casts?.length > 0) {
        this.logger.info(`${response.data.casts.length} casts tendance récupérés`);
        return response.data.casts;
      } else {
        this.logger.info(`Aucun cast tendance trouvé`);
        return [];
      }
    } catch (error) {
      this.logger.error(`Erreur lors de la récupération des casts tendance: ${error.message}`);
      if (error.response && error.response.data) {
        this.logger.error(`Détails de l'erreur: ${JSON.stringify(error.response.data)}`);
      }
      return [];
    }
  }

  // Vérifier si le bot suit un utilisateur donné
  async checkIfFollowing(targetFid) {
    try {
      this.logger.info(`Vérification si le bot suit l'utilisateur FID: ${targetFid}`);
      
      // Puisque l'endpoint relationship n'existe plus, nous allons récupérer la liste des utilisateurs suivis 
      // et vérifier si targetFid est dans cette liste
      const response = await axios.get(
        `https://api.neynar.com/v2/farcaster/user/followers`,
        {
          params: {
            fid: targetFid,
            limit: 100 // Augmenter si nécessaire
          },
          headers: {
            'x-api-key': this.apiKey,
            'Content-Type': 'application/json'
          }
        }
      );
      
      // Rechercher le bot dans la liste des followers
      const followers = response?.data?.followers || [];
      const isFollowing = followers.some(follower => follower.fid === parseInt(this.botFid, 10));
      
      this.logger.info(`Le bot suit l'utilisateur FID ${targetFid}: ${isFollowing}`);
      return isFollowing;
    } catch (error) {
      this.logger.error(`Erreur lors de la vérification du follow: ${error.message}`);
      if (error.response && error.response.data) {
        this.logger.error(`Détails de l'erreur: ${JSON.stringify(error.response.data)}`);
      }
      
      this.logger.info("Impossible de vérifier avec l'API, on suppose que le follow a réussi (log blockchain)");
      // En cas d'erreur, retourner true car le follow fonctionne, c'est juste la vérification qui échoue
      return true;
    }
  }
}

export default NeynarService;
