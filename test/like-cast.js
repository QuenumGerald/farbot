import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Charger explicitement le .env depuis la racine
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Import de la fonction createConfig et du ClippyBot
import { createConfig } from '../src/config/index.js';
import ClippyBot from '../src/bot/clippy.js';

// Création explicite de la config avec les variables d'environnement chargées
const config = createConfig(process.env);

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
