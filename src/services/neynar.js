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
    this.client = getNeynarAPIClient(this.apiKey);
  }

  getClient() {
    return this.client;
  }

  // Recherche de casts par mots-clés
  async searchCasts(keyword, limit = 10) {
    const result = await this.client.searchCasts({ q: keyword, limit });
    return result.casts;
  }

  // Publier un cast (post original ou réponse)
  async publishCast(text, parentHash = null) {
    const payload = {
      signer_uuid: this.signerUuid,
      text,
    };
    if (parentHash) payload.parent_hash = parentHash;
    return this.client.publishCast(payload);
  }

  // Répondre à un cast (syntactic sugar)
  async replyToCast(text, parentHash) {
    return this.publishCast(text, parentHash);
  }

  // Suivre un utilisateur par FID
  async followUser(fid) {
    return this.client.followUser({
      signer_uuid: this.signerUuid,
      target_fid: fid
    });
  }

  // Ne plus suivre un utilisateur
  async unfollowUser(fid) {
    return this.client.unfollowUser({
      signer_uuid: this.signerUuid,
      target_fid: fid
    });
  }

  // Aimer un cast
  async likeCast(castHash) {
    return this.client.likeCast({
      signer_uuid: this.signerUuid,
      cast_hash: castHash
    });
  }

  // Retirer un like
  async unlikeCast(castHash) {
    return this.client.unlikeCast({
      signer_uuid: this.signerUuid,
      cast_hash: castHash
    });
  }

  // Récupérer les mentions récentes
  async getMentions(limit = 10) {
    const result = await this.client.fetchMentionAndReplyNotifications({ signer_uuid: this.signerUuid, limit });
    return result.notifications || [];
  }

  // Récupérer le profil d'un utilisateur par FID
  async getUserByFid(fid) {
    const { users } = await this.client.fetchBulkUsers({ fids: [fid] });
    return users && users[0];
  }

  // Vérifier la relation de follow
  async checkIfFollowing(targetFid) {
    const { relationship } = await this.client.fetchUserRelationship({
      fid: config.bot.fid,
      target_fid: targetFid
    });
    return relationship?.following || false;
  }

  // Vérifier si un cast est liké
  async checkIfLiked(castHash) {
    const { cast } = await this.client.lookUpCastByHashOrWarpcastUrl({ hash: castHash });
    return cast?.reactions?.liked || false;
  }
}

export default new NeynarService();
