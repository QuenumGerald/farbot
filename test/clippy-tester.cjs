// Script de test robuste pour Clippy Bot (CommonJS)
require('dotenv').config();
const { NeynarV1APIClient } = require('@neynar/nodejs-sdk');

class ClippyTester {
  constructor() {
    // Vérification des variables d'environnement requises
    const requiredVars = ['NEYNAR_API_KEY', 'NEYNAR_SIGNER_UUID'];
    const missingVars = requiredVars.filter(v => !process.env[v]);
    
    if (missingVars.length > 0) {
      throw new Error(`Variables d'environnement manquantes: ${missingVars.join(', ')}`);
    }
    
    // Initialiser le client Neynar
    this.neynar = new NeynarV1APIClient(process.env.NEYNAR_API_KEY);
    this.signerUuid = process.env.NEYNAR_SIGNER_UUID;
    this.fid = process.env.NEYNAR_FID;
    
    console.log('ClippyTester initialisé avec succès');
  }
  
  // Récupérer des casts récents par mot-clé
  async searchCasts(keyword = 'ethereum', limit = 5) {
    try {
      console.log(`Recherche de casts avec le mot-clé "${keyword}"...`);
      
      // Explorer les APIs disponibles
      const castApi = this.neynar.apis.cast;
      
      // Récupérer les casts en utilisant searchCast si disponible
      const params = { q: keyword, limit };
      let response;
      
      try {
        response = await castApi.searchCast(params);
      } catch (err) {
        console.log('Méthode searchCast non disponible, tentative avec fetchRecentCasts...');
        response = await castApi.fetchRecentCasts({ limit });
      }
      
      if (response.data && response.data.casts) {
        const casts = response.data.casts;
        console.log(`${casts.length} casts trouvés`);
        return casts;
      } else {
        console.log('Format de réponse inattendu:', response);
        return [];
      }
    } catch (error) {
      console.error('Erreur lors de la recherche de casts:', error.message);
      if (error.response) {
        console.error('Détails:', error.response.data);
      }
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
      
      // Accéder à l'API Reactions
      const reactionsApi = this.neynar.apis.reactions;
      
      if (!reactionsApi) {
        console.log('API Reactions non disponible, essai avec la méthode générique...');
        
        // Méthode alternative - peut varier selon la version de l'API
        await this.neynar.likeCast(this.signerUuid, castHash);
      } else {
        // Utiliser l'API Reactions directement
        await reactionsApi.likeCast({
          signerUuid: this.signerUuid,
          castHash: castHash
        });
      }
      
      console.log('Cast liké avec succès!');
      return true;
    } catch (error) {
      console.error('Erreur lors du like du cast:', error.message);
      if (error.response) {
        console.error('Détails:', error.response.data);
      }
      return false;
    }
  }
  
  // Suivre un utilisateur
  async followUser(targetFid) {
    if (!targetFid) {
      throw new Error('FID de l\'utilisateur cible requis');
    }
    
    try {
      console.log(`Suivi de l'utilisateur avec FID ${targetFid}...`);
      
      // Accéder à l'API Follows
      const followsApi = this.neynar.apis.follows;
      
      if (!followsApi) {
        console.log('API Follows non disponible, essai avec la méthode générique...');
        
        // Méthode alternative - peut varier selon la version de l'API
        await this.neynar.followUser(this.signerUuid, targetFid);
      } else {
        // Utiliser l'API Follows directement
        await followsApi.followUser({
          signerUuid: this.signerUuid,
          targetFid: targetFid
        });
      }
      
      console.log('Utilisateur suivi avec succès!');
      return true;
    } catch (error) {
      console.error('Erreur lors du suivi de l\'utilisateur:', error.message);
      if (error.response) {
        console.error('Détails:', error.response.data);
      }
      return false;
    }
  }
  
  // Publier un cast
  async publishCast(text) {
    if (!text) {
      throw new Error('Texte du cast requis');
    }
    
    try {
      console.log('Publication d\'un nouveau cast...');
      
      // Accéder à l'API Cast
      const castApi = this.neynar.apis.cast;
      
      if (!castApi || !castApi.publishCast) {
        console.log('Méthode publishCast non disponible, essai avec la méthode générique...');
        
        // Méthode alternative - peut varier selon la version de l'API
        await this.neynar.publishCast(this.signerUuid, text);
      } else {
        // Utiliser l'API Cast directement
        await castApi.publishCast({
          signerUuid: this.signerUuid,
          text: text
        });
      }
      
      console.log('Cast publié avec succès!');
      return true;
    } catch (error) {
      console.error('Erreur lors de la publication du cast:', error.message);
      if (error.response) {
        console.error('Détails:', error.response.data);
      }
      return false;
    }
  }
  
  // Afficher les casts trouvés
  displayCasts(casts) {
    if (!casts || casts.length === 0) {
      console.log('Aucun cast à afficher');
      return;
    }
    
    console.log('\n===== CASTS TROUVÉS =====');
    casts.forEach((cast, idx) => {
      console.log(`\n[${idx + 1}] Auteur: ${cast.author?.username || cast.author?.fid}`);
      console.log(`Texte: ${cast.text?.substring(0, 100)}${cast.text?.length > 100 ? '...' : ''}`);
      console.log(`Hash: ${cast.hash}`);
      console.log('---------------------------');
    });
    
    console.log('\nPour interagir avec ces casts:');
    console.log(`- Like: node test/clippy-tester.cjs like ${casts[0].hash}`);
    console.log(`- Follow: node test/clippy-tester.cjs follow ${casts[0].author.fid}`);
  }
}

// Point d'entrée principal
async function main() {
  try {
    const tester = new ClippyTester();
    const command = process.argv[2] || 'help';
    const param = process.argv[3] || '';
    
    switch (command) {
      case 'search':
        const keyword = param || 'ethereum';
        const casts = await tester.searchCasts(keyword);
        tester.displayCasts(casts);
        break;
        
      case 'like':
        if (!param) {
          console.error('Veuillez spécifier un hash de cast à liker');
          console.log('Usage: node test/clippy-tester.cjs like HASH_DU_CAST');
          break;
        }
        await tester.likeCast(param);
        break;
        
      case 'follow':
        if (!param) {
          console.error('Veuillez spécifier un FID d\'utilisateur à suivre');
          console.log('Usage: node test/clippy-tester.cjs follow FID_UTILISATEUR');
          break;
        }
        await tester.followUser(param);
        break;
        
      case 'post':
        const text = param || 'Test automatique depuis Clippy Bot!';
        await tester.publishCast(text);
        break;
        
      case 'help':
      default:
        console.log('Usage: node test/clippy-tester.cjs [commande] [paramètre]');
        console.log('\nCommandes disponibles:');
        console.log('  search [mot-clé]  - Rechercher des casts (défaut: ethereum)');
        console.log('  like [hash]       - Liker un cast');
        console.log('  follow [fid]      - Suivre un utilisateur');
        console.log('  post [texte]      - Publier un nouveau cast');
        break;
    }
  } catch (error) {
    console.error('Erreur:', error.message);
  }
}

main();
