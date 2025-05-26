import ClippyBot from '../src/bot/clippy.js';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

// Prendre le hash du cast à liker depuis la ligne de commande
const TEST_CAST_HASH = process.argv[2] || 'HASH_DU_CAST_A_TESTER';

async function main() {
  if (!TEST_CAST_HASH || TEST_CAST_HASH === 'HASH_DU_CAST_A_TESTER') {
    console.error('Veuillez fournir un hash de cast valide en argument.');
    process.exit(1);
  }

  const bot = new ClippyBot();
  try {
    await bot.likeCast(TEST_CAST_HASH);
    console.log('Cast liké avec succès !');
  } catch (error) {
    console.error('Erreur lors du like du cast :', error);
  }
}

main();
