// Script ESM utilisant directement le SDK Neynar v1
import dotenv from 'dotenv';
import { createRequire } from 'module';

// Charger la configuration
dotenv.config();
const require = createRequire(import.meta.url);

// Importer le SDK Neynar avec la bonne interface
const { NeynarV1APIClient } = require('@neynar/nodejs-sdk');

class NeynarTester {
  constructor() {
    if (!process.env.NEYNAR_API_KEY) {
      throw new Error('NEYNAR_API_KEY est requise dans .env');
    }
    
    // Initialiser le client avec l'interface correcte
    this.client = new NeynarV1APIClient(
      process.env.NEYNAR_API_KEY
    );
    
    this.signerUuid = process.env.NEYNAR_SIGNER_UUID;
    console.log('Client Neynar V1 initialisé avec succès');
  }

  // Rechercher des casts récents
  async getRecentCasts(limit = 5) {
    try {
      console.log('Récupération des casts récents...');
      
      // Utiliser l'API CastApi via le client v1
      const castApi = this.client.getCastApi();
      const response = await castApi.fetchRecentCasts({
        limit: limit
      });
      
      return response.data.casts || [];
    } catch (error) {
      console.error('Erreur lors de la récupération des casts:', error.message);
      throw error;
    }
  }
  
  // Liker un cast
  async likeCast(castHash) {
    if (!castHash) {
      throw new Error('castHash est requis');
    }
    
    try {
      console.log(`Like du cast ${castHash}...`);
      
      // Utiliser l'API ReactionsApi via le client v1
      const reactionsApi = this.client.getReactionsApi();
      await reactionsApi.likeCast({
        castHash: castHash,
        signerUuid: this.signerUuid
      });
      
      console.log(`Cast liké avec succès: ${castHash}`);
      return true;
    } catch (error) {
      console.error(`Échec du like pour ${castHash}:`, error.message);
      throw error;
    }
  }
}

// Point d'entrée
async function main() {
  try {
    console.log('Initialisation du testeur Neynar...');
    const tester = new NeynarTester();
    
    // Action à exécuter
    const action = process.argv[2] || 'recent';
    const param = process.argv[3] || '';
    
    if (action === 'like' && param) {
      await tester.likeCast(param);
    }
    else if (action === 'recent') {
      // Récupérer et afficher les casts récents
      const limit = param ? parseInt(param) : 5;
      const casts = await tester.getRecentCasts(limit);
      
      if (casts.length > 0) {
        console.log(`\n${casts.length} casts récents trouvés:`);
        casts.forEach((cast, idx) => {
          console.log(`\n[${idx + 1}] Auteur: ${cast.author?.username || cast.author?.fid}`);
          console.log(`Texte: ${cast.text?.substring(0, 100)}${cast.text?.length > 100 ? '...' : ''}`);
          console.log(`Hash: ${cast.hash}`);
        });
        
        // Suggestion pour liker un cast
        console.log('\nPour liker un cast, utilisez:');
        console.log(`node test/neynar-v1-test.mjs like ${casts[0].hash}`);
      } else {
        console.log('Aucun cast récent trouvé.');
      }
    }
    else {
      console.log('Usage: node neynar-v1-test.mjs [action] [param]');
      console.log('Actions:');
      console.log('  recent [nombre] - Afficher les casts récents (défaut: 5)');
      console.log('  like [hash] - Liker un cast spécifique');
    }
    
  } catch (error) {
    console.error('Erreur:', error.message);
  }
}

main();
