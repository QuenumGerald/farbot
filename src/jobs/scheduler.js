const logger = require('../config/logger').child({ module: 'scheduler' });
const { scheduleCustomTask, scheduleHttpTask, initializeScheduler: initScheduler } = require('.');
const config = require('../config');

// Référence au bot pour les tâches
let botInstance = null;

// Mots-clés à rechercher dans les casts
const KEYWORDS = [
  'crypto', 'web3', 'blockchain', 'nft', 'defi', 'ethereum', 'bitcoin',
  'farcaster', 'frame', 'solana', 'base', 'warpcast', 'ai', 'ia', 'intelligence artificielle',
  'gemini', 'claude', 'gpt', 'llm', 'ml', 'machine learning', 'zora', 'lens'
];

// Configuration des différentes tâches et leurs fréquences
const TASKS_CONFIG = {
  // Publication de contenu texte avec des heures précises
  textPublications: {
    hours: [9, 12, 15, 18, 21],   // 5 publications par jour à des horaires fixes
    theme: ['actualités', 'tendances', 'conseils', 'discussion', 'réflexion']
  },
  
  // Publication d'images/illustrations
  imagePublications: {
    intervalMinutes: 120,          // Toutes les 2 heures, décalé de 30 minutes par rapport aux posts texte
    startHour: 10,                // Commence à 10h
    endHour: 22                   // Se termine à 22h
  },
  
  // Intégration sociale (likes, follows)
  socialInteractions: {
    likesIntervalMinutes: 30,      // Liker des contenus pertinents toutes les 30 minutes
    followsIntervalMinutes: 240    // Suivre de nouveaux comptes pertinents toutes les 4 heures
  },
  
  // Recherche de mots-clés et réponses
  keywordSearch: {
    intervalMinutes: 7             // Rechercher des mots-clés toutes les 7 minutes
  }
};

// Horaires de publication tout au long de la journée (en heures) - pour compatibilité 
// avec le code existant, à retirer à terme
const PUBLICATION_HOURS = TASKS_CONFIG.textPublications.hours;

/**
 * Calcule la prochaine date d'exécution pour une heure spécifique de la journée
 * @param {number} hour - Heure de la journée (0-23)
 * @returns {Date} Date du prochain exécution 
 */
function getNextRunTime(hour) {
  const now = new Date();
  const nextRun = new Date(now);
  
  nextRun.setHours(hour, 0, 0, 0); // Exécution à l'heure exacte (00:00 minute)
  
  // Si l'heure est déjà passée pour aujourd'hui, programmer pour demain
  if (nextRun <= now) {
    nextRun.setDate(nextRun.getDate() + 1);
  }
  
  return nextRun;
}

/**
 * Initialise le planificateur de tâches et enregistre les tâches
 * @param {Object} bot - Instance du bot
 * @returns {Promise<Object>} Planificateur initialisé
 */
async function initializeScheduler(bot) {
  try {
    botInstance = bot;
    
    // Initialiser le planificateur
    logger.info('Initialisation du planificateur BlazeJob...');
    await initScheduler();
    
    // === 1. RECHERCHE DE MOTS-CLÉS ET RÉPONSES ===
    const keywordSearchInterval = TASKS_CONFIG.keywordSearch.intervalMinutes * 60 * 1000;
    await scheduleCustomTask('recherche-mots-cles', async () => {
      try {
        logger.info('Recherche de casts contenant des mots-clés...');
        const count = await botInstance.searchAndRespondToKeywords(KEYWORDS, 20);
        logger.info(`Recherche terminée. ${count} nouveau(x) cast(s) traité(s).`);
      } catch (error) {
        logger.error('Erreur lors de la recherche de mots-clés:', error);
      }
    }, {
      runAt: new Date(),
      interval: keywordSearchInterval,
      timeout: 180000, // 3 minutes
      description: 'Recherche fréquente de casts contenant des mots-clés spécifiques'
    });
    
    logger.debug(`Tâche de recherche de mots-clés planifiée (toutes les ${TASKS_CONFIG.keywordSearch.intervalMinutes} minutes)`);
    
    // === 2. PUBLICATIONS DE TEXTE PLANIFIÉES ===
    for (let i = 0; i < TASKS_CONFIG.textPublications.hours.length; i++) {
      const hour = TASKS_CONFIG.textPublications.hours[i];
      const theme = TASKS_CONFIG.textPublications.theme[i] || 'général';
      const name = `publication-texte-${i + 1}`;
      
      // Obtenir la prochaine date d'exécution pour cette heure
      const nextRunTime = getNextRunTime(hour);
      
      // Planifier la tâche de publication avec BlazerJob
      await scheduleCustomTask(name, async () => {
        try {
          logger.info(`Début de la publication texte [${name}] - Thème: ${theme}`);
          await botInstance.publishDailyContent({ 
            theme, 
            withImage: false, 
            contentType: 'text'
          });
          logger.info(`Publication texte ${name} terminée avec succès`);
          
          // Planifier la prochaine exécution (demain à la même heure)
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(hour, 0, 0, 0);
          
          // Replanifier la même tâche pour demain
          await scheduleCustomTask(name, async () => {
            await botInstance.publishDailyContent({ 
              theme, 
              withImage: false, 
              contentType: 'text'
            });
          }, {
            runAt: tomorrow,
            timeout: 300000,
            description: `Publication texte quotidienne ${i + 1} (${hour}h00)`
          });
        } catch (error) {
          logger.error(`Erreur lors de la publication texte ${name}:`, error);
        }
      }, {
        runAt: nextRunTime,
        timeout: 300000, // 5 minutes
        description: `Publication texte ${i + 1} (${hour}h00) - Thème: ${theme}`
      });
      
      logger.debug(`Tâche de publication texte [${name}] planifiée pour ${nextRunTime.toISOString()}`);
    }
    
    // === 3. PUBLICATIONS D'IMAGES ===
    // Planification des publications d'images à intervalles réguliers
    const { startHour, endHour, intervalMinutes } = TASKS_CONFIG.imagePublications;
    const imagePublicationInterval = intervalMinutes * 60 * 1000;
    
    // Calcul de la prochaine heure de publication d'image
    const now = new Date();
    let nextImageTime = new Date(now);
    const currentHour = now.getHours();
    
    // Déterminer la prochaine heure pour la publication d'image
    if (currentHour < startHour) {
      // Avant l'heure de début, programmer pour l'heure de début
      nextImageTime.setHours(startHour, 30, 0, 0);
    } else if (currentHour >= endHour) {
      // Après l'heure de fin, programmer pour demain
      nextImageTime.setDate(nextImageTime.getDate() + 1);
      nextImageTime.setHours(startHour, 30, 0, 0);
    } else {
      // Pendant la période active, programmer dans X minutes
      nextImageTime = new Date(now.getTime() + 5 * 60 * 1000); // Début dans 5 minutes
    }
    
    await scheduleCustomTask('publication-image', async () => {
      try {
        // Vérifier si nous sommes dans la plage horaire autorisée
        const currentTime = new Date();
        const currentHour = currentTime.getHours();
        
        if (currentHour >= startHour && currentHour < endHour) {
          logger.info('Début de la publication d\'image...');
          await botInstance.publishDailyContent({ 
            theme: 'illustration', 
            withImage: true,
            contentType: 'image'
          });
          logger.info('Publication d\'image terminée avec succès');
        } else {
          logger.info('Publication d\'image ignorée : hors plage horaire');
        }
      } catch (error) {
        logger.error('Erreur lors de la publication d\'image:', error);
      }
    }, {
      runAt: nextImageTime,
      interval: imagePublicationInterval,
      timeout: 300000, // 5 minutes
      description: `Publication d'images (toutes les ${intervalMinutes} minutes entre ${startHour}h et ${endHour}h)`
    });
    
    logger.debug(`Tâche de publication d'images planifiée pour ${nextImageTime.toISOString()}`);
    
    // === 4. INTÉGRATION SOCIALE : LIKES ===
    const likesInterval = TASKS_CONFIG.socialInteractions.likesIntervalMinutes * 60 * 1000;
    await scheduleCustomTask('likes-automatiques', async () => {
      try {
        logger.info('Début de l\'activité de likes automatiques...');
        // Rechercher des casts récents contenant les mots-clés et les liker
        const likedCount = await botInstance.likeRecentCasts(10, KEYWORDS);
        logger.info(`Likes automatiques : ${likedCount} cast(s) liké(s) avec succès`);
      } catch (error) {
        logger.error('Erreur lors de l\'activité de likes automatiques:', error);
      }
    }, {
      runAt: new Date(Date.now() + 2 * 60 * 1000), // Démarrer dans 2 minutes
      interval: likesInterval,
      timeout: 120000, // 2 minutes
      description: `Likes automatiques (toutes les ${TASKS_CONFIG.socialInteractions.likesIntervalMinutes} minutes)`
    });
    
    logger.debug(`Tâche de likes automatiques planifiée (toutes les ${TASKS_CONFIG.socialInteractions.likesIntervalMinutes} minutes)`);
    
    // === 5. INTÉGRATION SOCIALE : FOLLOWS ===
    const followsInterval = TASKS_CONFIG.socialInteractions.followsIntervalMinutes * 60 * 1000;
    await scheduleCustomTask('follows-automatiques', async () => {
      try {
        logger.info('Début de l\'activité de follows automatiques...');
        // Rechercher des utilisateurs pertinents et les suivre
        const followedCount = await botInstance.followRelevantUsers(5);
        logger.info(`Follows automatiques : ${followedCount} utilisateur(s) suivi(s) avec succès`);
      } catch (error) {
        logger.error('Erreur lors de l\'activité de follows automatiques:', error);
      }
    }, {
      runAt: new Date(Date.now() + 10 * 60 * 1000), // Démarrer dans 10 minutes
      interval: followsInterval,
      timeout: 180000, // 3 minutes
      description: `Follows automatiques (toutes les ${TASKS_CONFIG.socialInteractions.followsIntervalMinutes} minutes)`
    });
    
    logger.debug(`Tâche de follows automatiques planifiée (toutes les ${TASKS_CONFIG.socialInteractions.followsIntervalMinutes} minutes)`);
    
    // === 6. VÉRIFICATION QUOTIDIENNE DU SYSTÈME ===
    const midnightCheck = getNextRunTime(0); // 0h00
    
    await scheduleCustomTask('verification-systeme', async () => {
      logger.info('Exécution de la vérification quotidienne du système...');
      
      // Vérifier la santé des services (Neynar, Gemini)
      try {
        await botInstance.neynarService.getUserByFid(1);
        logger.info('Service Neynar opérationnel');
      } catch (error) {
        logger.error('Erreur avec le service Neynar:', error);
      }
      
      try {
        await botInstance.geminiService.generateResponse('test');
        logger.info('Service Gemini opérationnel');
      } catch (error) {
        logger.error('Erreur avec le service Gemini:', error);
      }
      
      // Envoi d'une requête HTTP pour vérifier l'état global
      await scheduleHttpTask('health-check', {
        url: `${config.neynar.apiUrl}/v1/health`,
        method: 'GET'
      }, {
        runAt: new Date(),
        description: 'Vérification de l\'API Neynar'
      });
      
      logger.info('Vérification quotidienne du système terminée');
      
      // Planifier la prochaine vérification pour demain à minuit
      const nextMidnight = getNextRunTime(0);
      await scheduleCustomTask('verification-systeme', async () => {
        // Vérification du système
      }, {
        runAt: nextMidnight,
        timeout: 120000,
        description: 'Vérification quotidienne de l\'ensemble du système'
      });
    }, {
      runAt: midnightCheck,
      timeout: 120000, // 2 minutes
      description: 'Vérification quotidienne de l\'ensemble du système'
    });
    
    logger.info('Toutes les tâches ont été planifiées avec succès');
    return true;
  } catch (error) {
    logger.error('Erreur lors de l\'initialisation du planificateur:', error);
    throw error;
  }
}

module.exports = {
  initializeScheduler,
  KEYWORDS,
  PUBLICATION_HOURS
};
