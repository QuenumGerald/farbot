import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { getConfig } from '../src/config/index.js';
import ClippyBot from '../src/bot/clippy.js';

// Log immédiat pour vérifier que la console fonctionne
console.log('=========================================================');
console.log('DÉMARRAGE DU SCRIPT search-and-like.js - ' + new Date().toISOString());

try {
  // Charger manuellement le .env depuis la racine
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const envPath = path.resolve(__dirname, '../.env');
  console.log(`Chargement du .env depuis: ${envPath}`);

  // Lire et parser manuellement le fichier .env
  const envContent = fs.readFileSync(envPath, 'utf8');
  console.log(`Fichier .env lu: ${envContent.length} caractères`);
  const envConfig = dotenv.parse(envContent);

  // Utilisation des modules déjà importés
  console.log('Utilisation des modules...');

  // Création explicite de la config avec les variables d'environnement chargées manuellement
  console.log('Création de la configuration...');
  const config = getConfig(envConfig);

  console.log('CONFIG CHARGÉE:', {
    apiKeyDefined: !!config.neynar.apiKey,
    apiKeyPrefix: config.neynar.apiKey ? config.neynar.apiKey.substring(0, 5) + '...' : 'undefined',
    signerUuidDefined: !!config.neynar.signerUuid,
    botHandle: config.bot.handle
  });

  const KEYWORD = process.argv[2] || 'farcaster';
  const LIKE_LIMIT = parseInt(process.argv[3], 10) || 1;

  console.log(`RECHERCHE: mot-clé="${KEYWORD}", limite=${LIKE_LIMIT}`);

  async function main() {
    console.log('▶️ INITIALISATION DU BOT');
    const bot = new ClippyBot();
    try {
      console.log('▶️ RECHERCHE DES CASTS');
      const casts = await bot.searchAndRespondToKeywords(KEYWORD, LIKE_LIMIT);
      console.log(`📊 RÉSULTAT: ${casts ? casts.length : 0} casts trouvés`);
      
      // On va liker le ou les premiers casts trouvés
      if (!casts || casts.length === 0) {
        console.error('❌ ERREUR: Aucun cast trouvé pour le mot-clé.');
        return;
      }
      
      for (let i = 0; i < Math.min(LIKE_LIMIT, casts.length); i++) {
        const cast = casts[i];
        console.log(`👍 LIKE DU CAST: ${cast.hash}`);
        console.log(`   Texte: ${cast.text ? cast.text.substring(0, 30) + '...' : 'sans texte'}`);
        await bot.likeCast(cast.hash);
        console.log(`🎉 SUCCÈS: Cast liké: ${cast.hash}`);
      }
      console.log('✅ TRAITEMENT TERMINÉ');
    } catch (error) {
      console.error('❌ ERREUR:', error);
      // Afficher plus de détails sur l'erreur
      if (error.stack) console.error('STACK:', error.stack);
    }
  }

  // Exécuter avec un timeout pour s'assurer que tout est initialisé
  setTimeout(() => {
    console.log('🚀 DÉMARRAGE DE LA FONCTION PRINCIPALE');
    main().catch(err => {
      console.error('❌ ERREUR NON CAPTURÉE:', err);
    }).finally(() => {
      console.log('🏁 FIN DU SCRIPT');
    });
  }, 100);
  
} catch (error) {
  console.error('❌ ERREUR CRITIQUE:', error);
  if (error.stack) console.error('STACK:', error.stack);
}
