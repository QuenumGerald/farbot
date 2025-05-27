import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Charger manuellement le .env depuis la racine
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../.env');

// Lire et parser manuellement le fichier .env
const envConfig = dotenv.parse(fs.readFileSync(envPath));

// Import de la fonction getConfig et du ClippyBot
import { getConfig } from '../src/config/index.js';
import ClippyBot from '../src/bot/clippy.js';

// Création explicite de la config avec les variables d'environnement chargées manuellement
const config = getConfig(envConfig);

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
