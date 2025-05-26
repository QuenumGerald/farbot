// Script ESM qui utilise directement l'API Neynar sans dépendre du reste du projet
import dotenv from 'dotenv';
import { createRequire } from 'module';

// Charger les variables d'environnement
dotenv.config();

// Pour charger la bibliothèque Neynar directement
const require = createRequire(import.meta.url);
const { NeynarAPIClient } = require('@neynar/nodejs-sdk');

class NeynarTester {
  constructor() {
    // Vérifier que les variables d'environnement nécessaires sont définies
    if (!process.env.NEYNAR_API_KEY) {
      throw new Error('La clé API Neynar (NEYNAR_API_KEY) est requise dans le fichier .env');
    }
    
    // Initialiser le client Neynar
    this.client = new NeynarAPIClient(
      process.env.NEYNAR_API_KEY,
      process.env.NEYNAR_API_URL || 'https://api.neynar.com'
    );
    
    this.signerUuid = process.env.NEYNAR_SIGNER_UUID;
    console.log('Client Neynar initialisé avec succès.');
  }

  // Liker un cast
  async likeCast(castHash) {
    if (!castHash) {
      throw new Error('castHash est requis pour aimer un cast');
    }
    
    try {
      await this.client.likeCast(this.signerUuid, castHash);
      console.log(`Cast liké avec succès`, { castHash: castHash.substring(0, 8) + '...' });
      return true;
    } catch (error) {
      console.error(`Échec du like du cast ${castHash}:`, error);
      throw new Error(`Impossible d'aimer le cast: ${error.message}`);
    }
  }
  
  // Rechercher des casts
  async searchCasts(keywords, limit = 10) {
    try {
      // La recherche exacte dépend de l'API Neynar, ajustez selon la documentation
      const response = await this.client.searchCast(keywords.join(' '), limit);
      const casts = response.casts || [];
      
      console.log(`${casts.length} casts trouvés pour les mots-clés: ${keywords.join(', ')}`);
      return casts;
    } catch (error) {
      console.error('Erreur lors de la recherche de casts:', error);
      throw error;
    }
  }
}

async function main() {
  try {
    console.log('Initialisation du testeur Neynar...');
    const tester = new NeynarTester();
    
    // Choisir l'action à exécuter
    const action = process.argv[2] || 'help';
    const param = process.argv[3] || '';
    
    if (action === 'like' && param) {
      // Liker un cast
      console.log(`Like du cast ${param}...`);
      await tester.likeCast(param);
    }
    else if (action === 'search') {
      // Rechercher des casts
      const keywords = param ? [param] : ['bitcoin', 'ethereum', 'blockchain'];
      const casts = await tester.searchCasts(keywords, 5);
      
      if (casts.length) {
        console.log('\nRésultats de recherche:');
        casts.forEach((cast, idx) => {
          console.log(`\n[${idx + 1}] Auteur: ${cast.author?.username || cast.author?.fid}`);
          console.log(`Texte: ${cast.text}`);
          console.log(`Hash: ${cast.hash}`);
        });
      }
    }
    else {
      console.log('Usage: node neynar-direct.mjs [action] [param]');
      console.log('Actions disponibles:');
      console.log('  like [hash] - Liker un cast spécifique');
      console.log('  search [mot-clé] - Rechercher des casts (utilise les mots-clés par défaut si non spécifié)');
    }
    
  } catch (error) {
    console.error('Erreur lors du test :', error.message);
  }
}

main();
