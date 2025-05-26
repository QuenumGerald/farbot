import config from '../config/index.js';
import { createLogger } from '../config/logger.js';
import { getNeynarAPIClient } from './neynar-wrapper.js';

const logger = createLogger('neynar');

class NeynarService {
  constructor() {
    if (!config.neynar.apiKey) {
      throw new Error('La clé API Neynar (NEYNAR_API_KEY) est requise dans le fichier .env');
    }
    this.signerUuid = config.neynar.signerUuid;
    this.logger = logger.child({ service: 'neynar' });
    this.apiKey = config.neynar.apiKey;
    this.apiUrl = config.neynar.apiUrl;
    this.clientPromise = null;
  }

  async getClient() {
    if (!this.clientPromise) {
      this.clientPromise = getNeynarAPIClient().then(NeynarAPIClient =>
        new NeynarAPIClient(this.apiKey, this.apiUrl)
      );
    }
    return this.clientPromise;
  }

  // Récupérer les informations d'un utilisateur par son FID
  async getUserByFid(fid) {
    try {
      const client = await this.getClient();
      const response = await client.fetchBulkUsers([fid]);
      const user = response.users && response.users[0];
      
      if (!user) {
        throw new Error(`Utilisateur avec le FID ${fid} non trouvé`);
      }
      
      this.logger.debug(`Utilisateur récupéré: @${user.username} (${fid})`);
      return user;
    } catch (error) {
      this.logger.error(`Erreur lors de la récupération de l'utilisateur ${fid}:`, error);
      throw new Error(`Impossible de récupérer l'utilisateur: ${error.message}`);
    }
  }

  // Publier un nouveau cast
  async publishCast(text, options = {}) {
    const { parentUrl, parentFid, channel = 'farcaster' } = options;
    
    try {
      if (!text || typeof text !== 'string') {
        throw new Error('Le texte du cast est requis et doit être une chaîne de caractères');
      }
      
      const client = await this.getClient();
      const cast = await client.publishCast(
        this.signerUuid,
        text,
        {
          replyTo: parentUrl || null,
          channelId: parentFid ? null : channel,
        }
      );
      
      this.logger.info(`Nouveau cast publié: ${cast.hash}`, {
        text: text.length > 100 ? `${text.substring(0, 100)}...` : text,
        parentUrl,
        parentFid,
      });
      
      return cast;
    } catch (error) {
      this.logger.error('Erreur lors de la publication du cast:', {
        error: error.message,
        textLength: text?.length,
        parentUrl,
        parentFid,
      });
      throw new Error(`Échec de la publication du cast: ${error.message}`);
    }
  }

  // Répondre à un cast existant
  async replyToCast(text, parentUrl, options = {}) {
    if (!parentUrl) {
      throw new Error('parentUrl est requis pour répondre à un cast');
    }
    
    return this.publishCast(text, { ...options, parentUrl });
  }

  // Suivre un utilisateur
  async followUser(targetFid) {
    if (!targetFid) {
      throw new Error('targetFid est requis pour suivre un utilisateur');
    }
    
    try {
      const client = await this.getClient();
      await client.followUser(this.signerUuid, targetFid);
      this.logger.info(`Utilisateur suivi avec succès`, { targetFid });
      return true;
    } catch (error) {
      this.logger.error(`Échec du suivi de l'utilisateur ${targetFid}:`, error);
      throw new Error(`Impossible de suivre l'utilisateur: ${error.message}`);
    }
  }
  
  // Vérifier si un utilisateur est déjà suivi
  async checkIfFollowing(targetFid) {
    if (!targetFid) {
      throw new Error('targetFid est requis pour vérifier le statut de follow');
    }
    
    try {
      // Récupérer les informations de relation entre l'utilisateur et la cible
      const client = await this.getClient();
      const response = await client.fetchUserRelationship(config.bot.fid, targetFid);
      
      // Vérifier si l'utilisateur est déjà suivi
      const isFollowing = response?.relationship?.following || false;
      
      this.logger.debug(`Vérification du statut de follow pour l'utilisateur ${targetFid}`, {
        isFollowing
      });
      
      return isFollowing;
    } catch (error) {
      this.logger.error(`Erreur lors de la vérification du statut de follow pour l'utilisateur ${targetFid}:`, error);
      // En cas d'erreur, on suppose que l'utilisateur n'est pas suivi
      return false;
    }
  }

  // Ne plus suivre un utilisateur
  async unfollowUser(targetFid) {
    if (!targetFid) {
      throw new Error('targetFid est requis pour arrêter de suivre un utilisateur');
    }
    
    try {
      const client = await this.getClient();
      await client.unfollowUser(this.signerUuid, targetFid);
      this.logger.info(`Désabonnement réussi`, { targetFid });
      return true;
    } catch (error) {
      this.logger.error(`Échec du désabonnement de l'utilisateur ${targetFid}:`, error);
      throw new Error(`Impossible de se désabonner de l'utilisateur: ${error.message}`);
    }
  }

  // Aimer un cast
  async likeCast(castHash) {
    if (!castHash) {
      throw new Error('castHash est requis pour aimer un cast');
    }
    
    try {
      const client = await this.getClient();
      await client.likeCast(this.signerUuid, castHash);
      this.logger.info(`Cast liké avec succès`, { castHash: castHash.substring(0, 8) + '...' });
      return true;
    } catch (error) {
      this.logger.error(`Échec du like du cast ${castHash}:`, error);
      throw new Error(`Impossible d'aimer le cast: ${error.message}`);
    }
  }
  
  // Vérifier si un cast est déjà liké
  async checkIfLiked(castHash) {
    if (!castHash) {
      throw new Error('castHash est requis pour vérifier le statut de like');
    }
    
    try {
      // Récupérer les informations du cast, y compris les réactions
      const client = await this.getClient();
      const response = await client.lookUpCastByHashOrWarpcastUrl(castHash);
      const cast = response.cast;
      
      if (!cast) {
        throw new Error(`Cast ${castHash} non trouvé`);
      }
      
      // Vérifier si l'utilisateur a déjà liké ce cast
      // Note: Cette méthode peut varier selon l'API exacte de Neynar
      const isLiked = cast.reactions?.liked || false;
      
      this.logger.debug(`Vérification du statut de like pour le cast ${castHash.substring(0, 8)}...`, {
        isLiked
      });
      
      return isLiked;
    } catch (error) {
      this.logger.error(`Erreur lors de la vérification du statut de like pour le cast ${castHash}:`, error);
      // En cas d'erreur, on suppose que le cast n'est pas liké
      return false;
    }
  }

  // Récupérer les mentions récentes
  async getMentions(limit = 10) {
    try {
      if (limit < 1 || limit > 100) {
        throw new Error('La limite doit être comprise entre 1 et 100');
      }
      
      const client = await this.getClient();
      const response = await client.fetchMentionAndReplyNotifications(limit);
      const mentions = response.notifications || [];
      
      this.logger.debug(`${mentions.length} mentions récupérées`);
      return mentions;
    } catch (error) {
      this.logger.error('Erreur lors de la récupération des mentions:', error);
      throw new Error(`Impossible de récupérer les mentions: ${error.message}`);
    }
  }
}

const neynarService = new NeynarService();
export default neynarService;
