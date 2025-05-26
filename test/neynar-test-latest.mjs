// Script ESM direct pour tester les interactions Neynar 
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createRequire } from 'module';

// Configuration
dotenv.config();
const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Importation du SDK Neynar en utilisant la bonne version et interface
const NeynarSDK = require('@neynar/nodejs-sdk');

class NeynarTester {
  constructor() {
    if (!process.env.NEYNAR_API_KEY) {
      throw new Error('NEYNAR_API_KEY est requise dans .env');
    }
    
    // Déterminer la bonne classe/constructeur à utiliser
    let ClientClass;
    if (NeynarSDK.default) {
      ClientClass = NeynarSDK.default;
      console.log('Utilisation de NeynarSDK.default');
    } else if (NeynarSDK.NeynarAPIClient) {
      ClientClass = NeynarSDK.NeynarAPIClient;
      console.log('Utilisation de NeynarSDK.NeynarAPIClient');
    } else {
      console.log('Structure du SDK Neynar:', Object.keys(NeynarSDK));
      throw new Error('Interface du SDK Neynar non reconnue');
    }
    
    // Initialisation du client
    this.client = new ClientClass(
      process.env.NEYNAR_API_KEY, 
      process.env.NEYNAR_API_URL || 'https://api.neynar.com'
    );
    
    this.signerUuid = process.env.NEYNAR_SIGNER_UUID;
    console.log('Client Neynar initialisé avec succès');
  }

  // Liker un cast
  async likeCast(castHash) {
    if (!castHash) {
      throw new Error('castHash est requis');
    }
    
    try {
      await this.client.likeCast(this.signerUuid, castHash);
      console.log(`Cast liké avec succès: ${castHash.substring(0, 8)}...`);
      return true;
    } catch (error) {
      console.error(`Échec du like pour ${castHash}:`, error);
      throw error;
    }
  }
  
  // Rechercher des casts (avec détection de l'API correcte)
  async searchCasts(keywords, limit = 5) {
    try {
      let casts = [];
      const query = Array.isArray(keywords) ? keywords.join(' ') : keywords;
      
      console.log(`Recherche de casts avec: "${query}"`);
      
      // Tester différentes méthodes d'API selon la version du SDK
      if (this.client.searchCast) {
        const response = await this.client.searchCast(query, limit);
        casts = response.casts || [];
      } else if (this.client.search) {
        const response = await this.client.search(query, { limit });
        casts = response.casts || [];
      } else if (this.client.fetchRecentCasts) {
        // Fallback si la recherche n'est pas disponible
        console.log('API de recherche non disponible, utilisation de fetchRecentCasts');
        const response = await this.client.fetchRecentCasts({ limit });
        casts = response.casts || [];
      }
      
      console.log(`${casts.length} casts trouvés`);
      return casts;
    } catch (error) {
      console.error('Erreur lors de la recherche:', error);
      throw error;
    }
  }
}

// Point d'entrée principal
async function main() {
  try {
    console.log('Initialisation du testeur Neynar...');
    const tester = new NeynarTester();
    
    // Action à exécuter
    const action = process.argv[2] || 'help';
    const param = process.argv[3] || '';
    
    if (action === 'like' && param) {
      await tester.likeCast(param);
    }
    else if (action === 'search') {
      const keywords = param ? [param] : ['bitcoin', 'ethereum', 'web3'];
      const casts = await tester.searchCasts(keywords);
      
      if (casts.length > 0) {
        console.log('\nRésultats:');
        casts.forEach((cast, idx) => {
          console.log(`\n[${idx + 1}] Auteur: ${cast.author?.username || cast.author?.fid}`);
          console.log(`Texte: ${cast.text?.substring(0, 100)}${cast.text?.length > 100 ? '...' : ''}`);
          console.log(`Hash: ${cast.hash}`);
        });
      }
    }
    else {
      console.log('Usage: node neynar-test-latest.mjs [action] [param]');
      console.log('Actions:');
      console.log('  like [hash] - Liker un cast');
      console.log('  search [mot-clé] - Rechercher des casts');
    }
    
  } catch (error) {
    console.error('Erreur:', error.message);
  }
}

main();
