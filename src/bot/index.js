import { createLogger } from '../config/logger.js';
const logger = createLogger('bot');
import ClippyBot from './clippy-extended.js';
import config from '../config/index.js';
import neynarService from '../services/neynar.js';
import geminiService from '../services/gemini.js';
import { initializeScheduler } from '../jobs/scheduler.js';

// Instance singleton du bot
let botInstance = null;

/**
 * Initialise le bot Clippy et vérifie que tout fonctionne correctement
 * @returns {Promise<ClippyBot>} Instance du bot initialisée
 */
async function initializeBot() {
  try {
    // Si le bot est déjà initialisé, retourner l'instance existante
    if (botInstance) {
      return botInstance;
    }
    
    logger.info('Initialisation du bot Clippy...');
    
    // Créer une nouvelle instance du bot
    botInstance = new ClippyBot();
    
    // Vérifier la connectivité avec les services externes
    await _checkServices();
    
    logger.info(`Bot Clippy initialisé avec succès`, {
      handle: config.bot.handle,
      displayName: config.bot.displayName
    });
    
    return botInstance;
  } catch (error) {
    logger.error('Erreur fatale lors de l\'initialisation du bot:', error);
    throw error;
  }
}

/**
 * Effectue des vérifications de base pour s'assurer que les services 
 * externes sont accessibles et fonctionnels
 * @returns {Promise<boolean>} true si tous les services sont disponibles
 * @private
 */
async function _checkServices() {
  let allServicesOk = true;
  
  // Vérifier que Neynar est accessible en récupérant un utilisateur connu
  try {
    await neynarService.getUserByFid(1);
    logger.debug('Service Neynar opérationnel');
  } catch (neynarError) {
    logger.error('Erreur avec le service Neynar:', neynarError);
    // Une erreur avec Neynar est critique, on ne peut pas continuer
    throw new Error(`Service Neynar indisponible: ${neynarError.message}`);
  }
  
  // Vérifier que Gemini est accessible en générant une réponse simple
  try {
    await geminiService.generateResponse('Test de connectivité');
    logger.debug('Service Gemini opérationnel');
  } catch (geminiError) {
    // Les erreurs temporaires de Gemini (503, etc.) sont tolérées
    logger.warn('Service Gemini temporairement indisponible:', geminiError.message);
    logger.warn('Le bot continuera à fonctionner avec les réponses de secours');
    allServicesOk = false;
  }
  
  if (allServicesOk) {
    logger.info('Tous les services externes sont opérationnels');
  } else {
    logger.info('Bot démarré en mode dégradé (certains services indisponibles)');
  }
  
  return true;
}

/**
 * Récupère l'instance singleton du bot
 * @returns {ClippyBot|null} Instance du bot ou null si non initialisée
 */
function getBot() {
  return botInstance;
}

/**
 * Arrête proprement le bot et ses services
 * @returns {Promise<void>}
 */
async function shutdownBot() {
  if (botInstance) {
    logger.info('Arrêt du bot Clippy...');
    // Ajoutez ici toute logique de nettoyage nécessaire
    botInstance = null;
    logger.info('Bot Clippy arrêté avec succès');
  }
}

export { initializeBot, getBot, shutdownBot };

// --- Bloc de démarrage Render ---
process.on('uncaughtException', err => {
  console.error('Uncaught Exception:', err);
});
process.on('unhandledRejection', err => {
  console.error('Unhandled Rejection:', err);
});

console.log('Clippy bot démarré sur Render !');

initializeBot().then(async bot => {
  try {
    // Démarrage du bot si start() existe
    if (bot && typeof bot.start === 'function') {
      bot.start();
      console.log('Bot.start() exécuté');
    }
    
    // Initialisation du planificateur avec l'instance du bot
    console.log('Démarrage du planificateur...');
    const schedulerStarted = await initializeScheduler(bot);
    console.log(schedulerStarted ? 'Planificateur démarré avec succès!' : 'Échec du démarrage du planificateur');
    
    // Garde le process vivant
    setInterval(() => {}, 60 * 60 * 1000);
  } catch (error) {
    console.error('Erreur lors de l\'initialisation du scheduler:', error);
  }
}).catch(err => {
  console.error('Erreur au démarrage du bot:', err);
  process.exit(1);
});

