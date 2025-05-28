import { createLogger } from '../config/logger.js';
const logger = createLogger('scheduler');
import cron from 'node-cron';
import config from '../config/index.js';

// Référence au bot pour les tâches
let botInstance = null;

// Mots-clés à rechercher dans les casts
const KEYWORDS = [

  'hal finney', 'lightning network',
  'segwit', 'bitcoin halving', 'UTXO', 'proof of work',
  'bitcoin mining difficulty', 'bitcoin mempool', 'taproot upgrade',

  // Termes Ethereum spécifiques et techniques
  'gavin wood', 'solidity', 'ERC-20', 'EIP-1559', 'optimistic rollups',
  'layer 2 scaling', 'serenity upgrade', 'casper protocol',

  // Termes blockchain spécifiques et techniques
  'zero knowledge proofs', 'merkle tree', 'consensus algorithm',
  'delegated proof of stake', 'sharding implementation',
  'blockchain interoperability', 'atomic swap', 'chainlink oracle',
  'decentralized identity', 'evm compatibility',

  // Termes tech spécifiques et profonds
  'arm64 architecture', 'RISC processor', 'quantum computing',
  'neural network optimization', 'IPv6 transition', 'WebAssembly',
  'microservice architecture', 'TensorFlow implementation',
  'CUDA parallel computing', 'serverless deployment',

  // Termes Clippy et technologie rétro spécifiques
  'leanne ruzsa-atkinson',
  'kevan atkinson clippy', 'BonziBuddy purple gorilla', 'microsoft bob interface',
  'windows 95 release', 'windows NT kernel', 'internet explorer 6 quirks', 'MS-DOS commands'
];

// Configuration des différentes tâches et leurs fréquences
const TASKS_CONFIG = {
  // Publication de contenu texte avec des heures précises
  textPublications: {
    hours: [9, 14, 19]   // 3 publications texte par jour
  },

  // Publication d'images/illustrations
  imagePublications: {
    intervalMinutes: 720,          // 1 publication image toutes les 12h
    startHour: 10,                // Commence à 10h
    endHour: 22                   // Se termine à 22h
  },

  // Intégration sociale (likes, follows)
  socialInteractions: {
    likesIntervalMinutes: 60,      // Liker des contenus pertinents toutes les heures
    followsIntervalMinutes: 1    // Suivre de nouveaux comptes pertinents toutes les 1 minute (pour debug rapide)
  },

  // Recherche de mots-clés et réponses
  keywordSearch: {
    intervalMinutes: 30            // Répondre toutes les 30 minutes
  }
};

/**
 * Initialise le planificateur de tâches et enregistre les tâches
 * @param {Object} bot - Instance du bot
 * @returns {Promise<boolean>} True si l'initialisation a réussi
 */
async function initializeScheduler(bot) {
  botInstance = bot;
  logger.info('➡️ Planification des tâches avec node-cron');

  // 1. Recherche de mots-clés et réponses toutes les 30 minutes
  cron.schedule('*/30 * * * *', async () => {
    try {
      logger.info('🔍 Recherche de casts contenant des mots-clés...');
      const count = await botInstance.searchAndRespondToKeywords(KEYWORDS, 5);
      logger.info(`✅ Recherche terminée. ${count} nouveau(x) cast(s) traité(s).`);
    } catch (error) {
      logger.error('❌ Erreur lors de la recherche de mots-clés:', error);
    }
  });

  // 2. Publications de texte à 9h, 14h, 19h
  cron.schedule('0 9 * * *', async () => {
    try {
      logger.info('📝 Début de la publication texte [matin] - Thème: general');
      await botInstance.publishDailyContent({ theme: 'general', withImage: false, contentType: 'text' });
      logger.info('✅ Publication texte matin terminée avec succès');
    } catch (error) {
      logger.error('❌ Erreur lors de la publication texte matin:', error);
    }
  });
  cron.schedule('0 14 * * *', async () => {
    try {
      logger.info('📝 Début de la publication texte [après-midi] - Thème: general');
      await botInstance.publishDailyContent({ theme: 'general', withImage: false, contentType: 'text' });
      logger.info('✅ Publication texte après-midi terminée avec succès');
    } catch (error) {
      logger.error('❌ Erreur lors de la publication texte après-midi:', error);
    }
  });
  cron.schedule('0 19 * * *', async () => {
    try {
      logger.info('📝 Début de la publication texte [soir] - Thème: general');
      await botInstance.publishDailyContent({ theme: 'general', withImage: false, contentType: 'text' });
      logger.info('✅ Publication texte soir terminée avec succès');
    } catch (error) {
      logger.error('❌ Erreur lors de la publication texte soir:', error);
    }
  });

  // 3. Publication d'image à 10h et 22h
  cron.schedule('0 10 * * *', async () => {
    try {
      logger.info('🖼️ Début de la publication d\'image [matin]');
      await botInstance.publishDailyContent({ theme: 'illustration', withImage: false, contentType: 'text' });
      logger.info('✅ Publication d\'image matin terminée avec succès');
    } catch (error) {
      logger.error('❌ Erreur lors de la publication d\'image matin:', error);
    }
  });
  cron.schedule('0 22 * * *', async () => {
    try {
      logger.info('🖼️ Début de la publication d\'image [soir]');
      await botInstance.publishDailyContent({ theme: 'illustration', withImage: false, contentType: 'text' });
      logger.info('✅ Publication d\'image soir terminée avec succès');
    } catch (error) {
      logger.error('❌ Erreur lors de la publication d\'image soir:', error);
    }
  });

  // 4. Likes automatiques toutes les heures
  cron.schedule('0 * * * *', async () => {
    try {
      logger.info('👍 Début des likes automatiques...');
      const likedCount = await botInstance.likeRecentCasts(5, KEYWORDS);
      logger.info(`✅ ${likedCount} cast(s) liké(s) avec succès`);
    } catch (error) {
      logger.error('❌ Erreur lors des likes automatiques:', error);
    }
  });

  // 5. Follows automatiques toutes les minutes (pour debug)
  cron.schedule('*/1 * * * *', async () => {
    try {
      logger.info('➕ Début des follows automatiques...');
      const followedCount = await botInstance.followRelevantUsers(3, KEYWORDS);
      logger.info(`✅ ${followedCount} compte(s) suivi(s) avec succès`);
    } catch (error) {
      logger.error('❌ Erreur lors des follows automatiques:', error);
    }
  });

  logger.info('🟢 Toutes les tâches cron sont planifiées.');
  return true;
}

export { initializeScheduler, KEYWORDS, TASKS_CONFIG };

