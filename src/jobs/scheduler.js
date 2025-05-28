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
  console.log('>>>> DEMARRAGE initializeScheduler <<<<');
  logger.info('➡️ Entrée dans initializeScheduler');
  try {
    botInstance = bot;

    // Initialiser le planificateur
    logger.info('Initialisation du planificateur BlazeJob...');
    await initScheduler();
    console.log('>>>> BlazeJob démarré (initScheduler terminé) <<<<');

    // Utilitaire pour calculer les heures en millisecondes
    const MINUTE = 60 * 1000;
    const HOUR = 60 * MINUTE;
    const DAY = 24 * HOUR;

    // Utilitaire pour planifier à une heure précise
    function getNextTimeAt(hour, minute = 0) {
      const now = new Date();
      const nextRun = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        hour,
        minute,
        0
      );

      // Si l'heure est déjà passée aujourd'hui, programmer pour demain
      if (nextRun < now) {
        nextRun.setDate(nextRun.getDate() + 1);
      }

      return nextRun;
    }

    // Mode maintenance: uniquement les recherches/réponses, pas de publications ni de follows

    // 1. RECHERCHE DE MOTS-CLÉS ET RÉPONSES (toutes les 30 minutes)
    await scheduleCustomTask(
      'recherche-mots-cles',
      async () => {
        try {
          logger.info('🔍 Recherche de casts contenant des mots-clés...');
          // Appeler la méthode searchAndRespondToKeywords
          const count = await botInstance.searchAndRespondToKeywords(KEYWORDS, 5);
          logger.info(`✅ Recherche terminée. ${count} nouveau(x) cast(s) traité(s).`);
        } catch (error) {
          logger.error('❌ Erreur lors de la recherche de mots-clés:', error);
          return { retryAfter: 5 * MINUTE }; // Nouvelle tentative après 5 minutes
        }
      },
      {
        runEvery: TASKS_CONFIG.keywordSearch.intervalMinutes * MINUTE,
        startAt: new Date(Date.now() + 1 * MINUTE), // Démarrer dans 1 minute
        timeout: 10 * MINUTE,
        maxRetries: 3,
        description: 'Recherche de casts contenant des mots-clés spécifiques',
        priority: 10
      }
    );

    // 2. PUBLICATIONS DE TEXTE (3 fois par jour à heures fixes)
    for (const hour of TASKS_CONFIG.textPublications.hours) {
      const name = `publication-texte-${TASKS_CONFIG.textPublications.hours.indexOf(hour) + 1}`;
      const theme = 'general'; // Thème générique pour toutes les publications

      await scheduleCustomTask(
        name,
        async () => {
          try {
            logger.info(`📝 Début de la publication texte [${name}] - Thème: ${theme}`);
            await botInstance.publishDailyContent({
              theme,
              withImage: false,
              contentType: 'text'
            });
            logger.info(`✅ Publication texte ${name} terminée avec succès`);

            // Reprogrammer pour le lendemain à la même heure
            return { nextRunAt: getNextTimeAt(hour) };
          } catch (error) {
            logger.error(`❌ Erreur lors de la publication texte ${name}:`, error);
            return { retryAfter: 15 * MINUTE }; // Nouvelle tentative après 15 minutes
          }
        },
        {
          startAt: getNextTimeAt(hour),
          timeout: 5 * MINUTE,
          maxRetries: 2,
          description: `Publication texte quotidienne (${hour}h00) - Thème: ${theme}`,
          priority: 5
        }
      );
    }

    // logger.info('🟢 Enregistrement de la tâche "publication-images" (2 fois par jour)');
    try {
      await scheduleCustomTask(
        'publication-images',
        async () => {
        try {
          logger.info('🖼️ Début de la publication d\'image');
          // Image n'est pas supportée, on utilise juste un post texte
          await botInstance.publishDailyContent({
            theme: 'illustration',
            withImage: false,
            contentType: 'text'
          });
          logger.info('✅ Publication d\'image terminée avec succès');

          // Calculer la prochaine exécution
          const now = new Date();
          const hour = now.getHours();

          // Si on est avant 16h, prochaine exécution à 22h, sinon demain à 10h
          const nextRun = hour < 16 ? getNextTimeAt(22) : getNextTimeAt(10);
          return { nextRunAt: nextRun };
        } catch (error) {
          logger.error('❌ Erreur lors de la publication d\'image:', error);
          return { retryAfter: 15 * MINUTE };
        }
      },
      {
        // Démarrer à 10h aujourd'hui ou demain selon l'heure actuelle
        startAt: getNextTimeAt(10),
        timeout: 10 * MINUTE,
        maxRetries: 2,
        description: 'Publication d\'images 2 fois par jour (10h et 22h)',
        priority: 5
      }
    );

    // logger.info('🟢 Enregistrement de la tâche "likes-automatiques" (toutes les heures)');
    await scheduleCustomTask(
        'likes-automatiques',
        async () => {
          logger.info('👍 Début des likes automatiques...');
          const likedCount = await botInstance.likeRecentCasts(5, KEYWORDS); // Limité à 5 likes
          logger.info(`✅ ${likedCount} cast(s) liké(s) avec succès`);
        },
        {
          runEvery: TASKS_CONFIG.socialInteractions.likesIntervalMinutes * MINUTE,
          startAt: new Date(Date.now() + 30 * MINUTE), // Démarrer dans 30 minutes
          timeout: 5 * MINUTE,
          maxRetries: 2,
          description: 'Likes automatiques des contenus pertinents'
        }
      );
      logger.info('✅ Tâche "likes-automatiques" planifiée');
    } catch (error) {
      logger.error('❌ Erreur lors de la planification de la tâche "likes-automatiques" :', error);
    }

    // 3. FOLLOWS AUTOMATIQUES (toutes les 1 minute pour debug)
    await scheduleCustomTask(
      'follows-automatiques',
      async () => {
        logger.info('➕ Début des follows automatiques...');
        const followedCount = await botInstance.followRelevantUsers(3, KEYWORDS); // Limité à 3 follows
        logger.info(`✅ ${followedCount} compte(s) suivi(s) avec succès`);
      },
      {
        runEvery: TASKS_CONFIG.socialInteractions.followsIntervalMinutes * MINUTE,
        startAt: new Date(Date.now() + 5 * 1000), // Démarrer dans 5 secondes
        timeout: 5 * MINUTE,
        maxRetries: 2,
        description: 'Follows automatiques des comptes pertinents'
      }
    );
    logger.info('✅ Tâche "follows-automatiques" planifiée');

    logger.info(`🔄 Planificateur démarré avec succès à ${new Date().toISOString()}`);
    return true;
  } catch (error) {
    logger.error('❌ Erreur lors de l\'initialisation du planificateur:', error);
    throw error;
  }
}

export { initializeScheduler, KEYWORDS, TASKS_CONFIG };
