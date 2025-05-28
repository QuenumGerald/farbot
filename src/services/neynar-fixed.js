import axios from 'axios';
import { NeynarAPIClient } from '@neynar/nodejs-sdk';
import config from '../config.js';
import logger from '../logger.js';

// Classe pour interagir avec l'API Neynar
class NeynarService {
  constructor(apiKey, signerUuid, botFid) {
    this.apiKey = apiKey;
    this.signerUuid = signerUuid;
    this.botFid = botFid;
    this.logger = logger;
    
    // Initialisation du client SDK officiel Neynar
    this.client = new NeynarAPIClient(apiKey);
  }

  // Rechercher des casts contenant un mot-clé
  async searchCasts(key, limit = 10, opts = {}) {
    this.logger.info(`Recherche de casts avec mot-clé: "${key}", limite: ${limit}`);
    let allResults = [];
    
    try {
      // 1. D'abord, essayer avec le SDK officiel
      try {
        const response = await this.client.searchCasts({
          query: key,
          limit
        });
        
        if (response?.casts?.length > 0) {
          this.logger.info(`Résultat SDK pour "${key}": ${response.casts.length} casts trouvés`);
          return response.casts;
        } else {
          this.logger.info(`Aucun cast trouvé pour "${key}" via SDK, essai avec HTTP direct`);
        }
      } catch (sdkError) {
        this.logger.warn(`Erreur SDK lors de la recherche: ${sdkError.message}, essai avec HTTP direct`);
      }
      
      // 2. Essayer avec HTTP direct si le SDK échoue
      try {
        const params = {
          q: key,
          limit: limit - allResults.length, // ne demande que ce qu'il manque
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
      
      // Utiliser la méthode searchUser du client SDK pour trouver les mentions
      const response = await this.client.searchUser({
        q: `@${config.bot.username}`,
        limit
      });
      
      // Filter pour ne garder que les mentions dans les casts
      const mentions = response?.result?.users?.filter(user => 
        user.casts && user.casts.some(cast => 
          cast.text.includes(`@${config.bot.username}`)
        )
      ) || [];
      
      this.logger.info(`${mentions.length} mentions trouvées pour le bot`);
      return mentions;
    } catch (error) {
      this.logger.error(`Erreur lors de la récupération des mentions: ${error.message}`);
      return [];
    }
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
      return { success: false, error: error.message };
    }
  }

  // Retirer le like d'un cast
  async unlikeCast(castHash) {
    try {
      this.logger.info(`Tentative d'unlike du cast: ${castHash}`);
      
      // Utiliser la méthode publishReaction avec reaction_type = 'unlike'
      const response = await this.client.publishReaction({
        reaction_type: 'unlike',
        signer_uuid: this.signerUuid,
        target: castHash
      });
      
      this.logger.info(`Unlike réussi pour le cast: ${castHash}`);
      return response;
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
      
      // Utiliser la méthode fetchReactionsByCast pour vérifier les likes existants
      const response = await this.client.fetchReactionsByCast({
        castHash,
        type: 'like'
      });
      
      // Vérifier si le bot est dans la liste des utilisateurs qui ont liké
      const isLiked = response?.reactions?.some(reaction => 
        reaction.fid === parseInt(this.botFid, 10)
      );
      
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
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey
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
      
      // Utiliser une requête directe à l'API pour vérifier la relation
      const response = await axios.get(
        `https://api.neynar.com/v2/farcaster/user/relationship`,
        {
          params: {
            fid: this.botFid,
            target_fid: targetFid
          },
          headers: {
            'x-api-key': this.apiKey,
            'Content-Type': 'application/json'
          }
        }
      );
      
      const isFollowing = response.data?.result?.following || false;
      this.logger.info(`Le bot suit l'utilisateur FID ${targetFid}: ${isFollowing}`);
      return isFollowing;
    } catch (error) {
      this.logger.error(`Erreur lors de la vérification du follow: ${error.message}`);
      if (error.response && error.response.data) {
        this.logger.error(`Détails de l'erreur: ${JSON.stringify(error.response.data)}`);
      }
      return false;
    }
  }
}

export default NeynarService;
