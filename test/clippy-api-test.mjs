// Script de test fonctionnel pour Clippy en mode ESM
import dotenv from 'dotenv';
import { createRequire } from 'module';

// Configuration
dotenv.config();
const require = createRequire(import.meta.url);
const SDK = require('@neynar/nodejs-sdk');

class NeynarHelper {
  constructor() {
    // Vérifier les variables d'environnement
    if (!process.env.NEYNAR_API_KEY) {
      throw new Error('NEYNAR_API_KEY est requise dans .env');
    }
    
    // Initialiser le client avec la bonne structure
    this.client = new SDK.NeynarV1APIClient(process.env.NEYNAR_API_KEY);
    this.signerUuid = process.env.NEYNAR_SIGNER_UUID;
    
    // Accès direct aux APIs
    this.castApi = this.client.apis.cast;
    this.userApi = this.client.apis.user;
    this.followsApi = this.client.apis.follows;
    this.reactionsApi = this.client.apis.follows; // Cette API n'existe peut-être pas, à vérifier
    
    console.log('Helper Neynar initialisé avec succès');
  }

  // Récupérer des casts récents
  async getRecentCasts(limit = 5) {
    try {
      console.log(`Récupération des ${limit} casts les plus récents...`);
      const response = await this.castApi.fetchRecentCasts({ limit });
      return response.data.casts || [];
    } catch (error) {
      console.error('Erreur lors de la récupération des casts:', error.message);
      return [];
    }
  }
  
  // Liker un cast
  async likeCast(castHash) {
    if (!castHash) {
      throw new Error('Hash du cast requis');
    }
    
    try {
      console.log(`Like du cast ${castHash}...`);
      // Note: Cette méthode peut ne pas exister dans votre version du SDK
      // Ajustez selon la documentation ou l'exploration du SDK
      if (this.reactionsApi && this.reactionsApi.likeCast) {
        await this.reactionsApi.likeCast({
          castHash,
          signerUuid: this.signerUuid
        });
        console.log('Cast liké avec succès');
        return true;
      } else {
        console.error('Méthode likeCast non disponible dans cette version du SDK');
        return false;
      }
    } catch (error) {
      console.error(`Échec du like pour ${castHash}:`, error.message);
      return false;
    }
  }
  
  // Suivre un utilisateur
  async followUser(fid) {
    if (!fid) {
      throw new Error('FID de l\'utilisateur requis');
    }
    
    try {
      console.log(`Suivi de l'utilisateur ${fid}...`);
      if (this.followsApi && this.followsApi.followUser) {
        await this.followsApi.followUser({
          targetFid: fid,
          signerUuid: this.signerUuid
        });
        console.log('Utilisateur suivi avec succès');
        return true;
      } else {
        console.error('Méthode followUser non disponible dans cette version du SDK');
        return false;
      }
    } catch (error) {
      console.error(`Échec du suivi pour ${fid}:`, error.message);
      return false;
    }
  }
}

// Point d'entrée principal
async function main() {
  try {
    const helper = new NeynarHelper();
    const action = process.argv[2] || 'recent';
    const param = process.argv[3] || '';
    
    switch (action) {
      case 'recent':
        const limit = param ? parseInt(param) : 5;
        const casts = await helper.getRecentCasts(limit);
        
        if (casts.length > 0) {
          console.log(`\n${casts.length} casts récents :`);
          casts.forEach((cast, idx) => {
            console.log(`\n[${idx + 1}] Auteur: ${cast.author?.username || cast.author?.fid}`);
            console.log(`Texte: ${cast.text?.substring(0, 100)}${cast.text?.length > 100 ? '...' : ''}`);
            console.log(`Hash: ${cast.hash}`);
          });
          
          console.log('\nCommandes disponibles :');
          console.log(`- Pour liker un cast: node test/clippy-api-test.mjs like ${casts[0].hash}`);
          console.log(`- Pour suivre un auteur: node test/clippy-api-test.mjs follow ${casts[0].author.fid}`);
        } else {
          console.log('Aucun cast trouvé');
        }
        break;
        
      case 'like':
        if (!param) {
          console.log('Veuillez spécifier un hash de cast à liker');
          break;
        }
        await helper.likeCast(param);
        break;
        
      case 'follow':
        if (!param) {
          console.log('Veuillez spécifier un FID d\'utilisateur à suivre');
          break;
        }
        await helper.followUser(param);
        break;
        
      default:
        console.log('Usage: node clippy-api-test.mjs [action] [param]');
        console.log('Actions disponibles:');
        console.log('  recent [limit] - Afficher les casts récents');
        console.log('  like [hash] - Liker un cast');
        console.log('  follow [fid] - Suivre un utilisateur');
        break;
    }
  } catch (error) {
    console.error('Erreur:', error.message);
  }
}

main();
