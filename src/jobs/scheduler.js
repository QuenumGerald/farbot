import { createLogger } from '../config/logger.js';
const logger = createLogger('scheduler');
import { scheduleCustomTask, scheduleCronTask, initializeScheduler as initScheduler } from './index.js';
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
    followsIntervalMinutes: 240    // Suivre de nouveaux comptes pertinents toutes les 4 heures
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
  try {
    botInstance = bot;

    // Initialiser le planificateur
    logger.info('Initialisation du planificateur BlazeJob...');
    await initScheduler();

    // 1. RECHERCHE DE MOTS-CLÉS ET RÉPONSES
    await scheduleCronTask(
      'recherche-mots-cles',
      '*/7 * * * *', // Toutes les 7 minutes
      async () => {
        try {
          logger.info('🔍 Recherche de casts contenant des mots-clés...');
          // Appeler la méthode searchAndRespondToKeywordsExtended définie dans clippy-extended.js
          const count = await botInstance.searchAndRespondToKeywordsExtended(KEYWORDS, 20);
          logger.info(`✅ Recherche terminée. ${count} nouveau(x) cast(s) traité(s).`);
        } catch (error) {
          logger.error('❌ Erreur lors de la recherche de mots-clés:', error);
          return { retryAfter: 300000 }; // Nouvelle tentative après 5 minutes
        }
      },
      {
        timeout: 180000, // 3 minutes
        maxRetries: 3,
        description: 'Recherche fréquente de casts contenant des mots-clés spécifiques',
        priority: 10 // Haute priorité pour cette tâche critique
      }
    );

    // 2. PUBLICATIONS DE TEXTE PLANIFIÉES
    for (let i = 0; i < TASKS_CONFIG.textPublications.hours.length; i++) {
      const hour = TASKS_CONFIG.textPublications.hours[i];
      const theme = 'général';
      const name = `publication-texte-${i + 1}`;

      // Créer une expression cron pour exécuter chaque jour à l'heure spécifiée
      const cronExpression = `0 ${hour} * * *`; // Tous les jours à ${hour}:00

      await scheduleCronTask(
        name,
        cronExpression,
        async () => {
          try {
            logger.info(`📝 Début de la publication texte [${name}] - Thème: ${theme}`);
            await botInstance.publishDailyContent({
              theme,
              withImage: false,
              contentType: 'text'
            });
            logger.info(`✅ Publication texte ${name} terminée avec succès`);
          } catch (error) {
            logger.error(`❌ Erreur lors de la publication texte ${name}:`, error);
            return { retryAfter: 900000 }; // Nouvelle tentative après 15 minutes
          }
        },
        {
          timeout: 300000, // 5 minutes
          maxRetries: 2,
          description: `Publication texte quotidienne (${hour}h00) - Thème: ${theme}`,
          priority: 5 // Priorité moyenne pour les publications planifiées
        }
      );
    }

    // 3. PUBLICATIONS D'IMAGES
    const { startHour, endHour, intervalMinutes } = TASKS_CONFIG.imagePublications;

    await scheduleCronTask(
      'publication-images',
      `*/${intervalMinutes} ${startHour}-${endHour} * * *`, // Toutes les X minutes entre startHour et endHour
      async () => {
        try {
          logger.info('🖼️  Début de la publication d\'image');
          await botInstance.publishDailyContent({
            theme: 'illustration',
            withImage: true,
            contentType: 'image'
          });
          logger.info('✅ Publication d\'image terminée avec succès');
        } catch (error) {
          logger.error('❌ Erreur lors de la publication d\'image:', error);
          return { retryAfter: 900000 }; // Nouvelle tentative après 15 minutes
        }
      },
      {
        timeout: 600000, // 10 minutes pour la génération d'image
        maxRetries: 2,
        description: `Publication d'images toutes les ${intervalMinutes} minutes entre ${startHour}h et ${endHour}h`,
        priority: 5
      }
    );

    // 4. INTERACTIONS SOCIALES : LIKES
    await scheduleCronTask(
      'likes-automatiques',
      '*/30 * * * *', // Toutes les 30 minutes
      async () => {
        try {
          logger.info('👍 Début des likes automatiques...');
          const likedCount = await botInstance.likeRecentCasts(10, KEYWORDS);
          logger.info(`✅ ${likedCount} cast(s) liké(s) avec succès`);
        } catch (error) {
          logger.error('❌ Erreur lors des likes automatiques:', error);
          return { retryAfter: 300000 }; // Nouvelle tentative après 5 minutes
        }
      },
      {
        timeout: 300000, // 5 minutes
        maxRetries: 2,
        description: 'Likes automatiques des contenus pertinents',
        priority: 3
      }
    );

    // 5. INTERACTIONS SOCIALES : FOLLOWS
    await scheduleCronTask(
      'follows-automatiques',
      '0 */4 * * *', // Toutes les 4 heures
      async () => {
        try {
          logger.info('👥 Début des follows automatiques...');
          const followedCount = await botInstance.followRelevantUsers(30);
          logger.info(`✅ ${followedCount} utilisateur(s) suivi(s) avec succès`);
        } catch (error) {
          logger.error('❌ Erreur lors des follows automatiques:', error);
          return { retryAfter: 600000 }; // Nouvelle tentative après 10 minutes
        }
      },
      {
        timeout: 300000, // 5 minutes
        maxRetries: 2,
        description: 'Suivi automatique des utilisateurs pertinents',
        priority: 2
      }
    );

    logger.info(`🔄 Planificateur démarré avec succès à ${new Date().toISOString()}`);
    return true;
  } catch (error) {
    logger.error('❌ Erreur lors de l\'initialisation du planificateur:', error);
    throw error;
  }
}

export { initializeScheduler, KEYWORDS, TASKS_CONFIG };
