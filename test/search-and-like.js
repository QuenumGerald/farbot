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

const KEYWORD = process.argv[2] || 'farcaster'; // Mot-clé à chercher
const LIKE_LIMIT = parseInt(process.argv[3], 10) || 1;

async function main() {
  const bot = new ClippyBot();
  try {
    const casts = await bot.searchAndRespondToKeywords(KEYWORD, LIKE_LIMIT);
    // On va liker le ou les premiers casts trouvés
    if (!casts || casts.length === 0) {
      console.error('Aucun cast trouvé pour le mot-clé.');
      process.exit(1);
    }
    for (let i = 0; i < Math.min(LIKE_LIMIT, casts.length); i++) {
      const cast = casts[i];
      await bot.likeCast(cast.hash);
      console.log(`Cast liké : ${cast.hash}`);
    }
  } catch (error) {
    console.error('Erreur lors de la recherche ou du like :', error);
    process.exit(1);
  }
}

main();
