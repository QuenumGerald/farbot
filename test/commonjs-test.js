// Test en CommonJS
const ClippyBot = require('../src/bot/clippy');
require('dotenv').config();

async function main() {
  try {
    console.log('Initialisation de ClippyBot...');
    const bot = new ClippyBot();
    
    // Test de like d'un cast
    const castHash = 'REMPLACEZ_PAR_UN_HASH_VALIDE';
    if (castHash && castHash !== 'REMPLACEZ_PAR_UN_HASH_VALIDE') {
      console.log(`Like du cast ${castHash}...`);
      await bot.likeCast(castHash);
      console.log('Cast liké avec succès !');
    } else {
      console.log('Veuillez spécifier un hash de cast valide');
    }
    
  } catch (error) {
    console.error('Erreur lors du test :', error);
  }
}

main();
