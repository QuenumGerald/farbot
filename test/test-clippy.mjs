// Script ESM pur
import ClippyBot from '../src/bot/clippy.js';
import dotenv from 'dotenv';
import { createRequire } from 'module';

// Configuration
dotenv.config();

// Pour charger d'autres dépendances CommonJS si nécessaire
const require = createRequire(import.meta.url);

async function main() {
  try {
    console.log('Initialisation de ClippyBot...');
    const bot = new ClippyBot();
    
    // Test du bot - choisir une seule fonction à tester
    const testFunction = process.argv[2] || 'autopost';
    const castHash = process.argv[3] || '';
    
    if (testFunction === 'like' && castHash) {
      // Test de like d'un cast
      console.log(`Like du cast ${castHash}...`);
      await bot.likeCast(castHash);
      console.log('Cast liké avec succès !');
    } 
    else if (testFunction === 'autopost') {
      // Test de publication automatique
      console.log('Génération et publication d\'un post...');
      await bot.publishAutoPost();
      console.log('Post publié avec succès !');
    }
    else {
      console.log('Usage: node test-clippy.mjs [fonction] [param]');
      console.log('Fonctions disponibles: like (+ hash), autopost');
    }
    
  } catch (error) {
    console.error('Erreur lors du test :', error.message);
    console.error(error.stack);
  }
}

main();
