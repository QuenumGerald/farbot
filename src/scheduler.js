import cron from 'node-cron';
import socialActions from './services/socialActions.js';
import contentGenerator from './services/contentGenerator.js';
import { createLogger } from './config/logger.js';
import fs from 'fs';
import path from 'path';
import { isBrowserLocked } from './utils/browserLock.js';

// Variable globale pour suivre l'exécution des tâches
const runningTasks = {
  replyTask: false,
  followTask: false
};

const logger = createLogger('scheduler');
const HISTORY_PATH = path.resolve(process.cwd(), 'reply_history.json');
const DELAY_DAYS = 15;

function loadHistory() {
  try {
    if (fs.existsSync(HISTORY_PATH)) {
      const raw = fs.readFileSync(HISTORY_PATH, 'utf-8');
      return JSON.parse(raw || '{}');
    }
  } catch (e) {
    logger.error('Erreur chargement historique:', e);
  }
  return {};
}

function saveHistory(history) {
  try {
    fs.writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2), 'utf-8');
  } catch (e) {
    logger.error('Erreur sauvegarde historique:', e);
  }
}

function canReplyTo(authorId, history) {
  if (!authorId) return false;
  const last = history[authorId];
  if (!last) return true;
  const now = Date.now();
  const diff = now - last;
  return diff > DELAY_DAYS * 24 * 60 * 60 * 1000;
}

function updateHistory(authorId, history) {
  history[authorId] = Date.now();
}

// Répondre automatiquement à des messages contenant un mot-clé toutes les heures
// Recherche automatique désactivée temporairement

cron.schedule('*/30 * * * *', async () => {
  // Ne pas exécuter si cette tâche est déjà en cours ou si une autre tâche utilise le navigateur
  if (runningTasks.replyTask || isBrowserLocked()) {
    logger.info('Une tâche est déjà en cours d\'exécution ou le navigateur est verrouillé. Planification de la tâche de réponse ignorée.');
    return;
  }

  // Marquer la tâche comme en cours
  runningTasks.replyTask = true;

  logger.info('Début du job planifié : recherche et réponse automatique aux messages...');
  const history = loadHistory();
  let nbReplies = 0;
  let followCount = 0; // Déclarer followCount au niveau supérieur pour qu'il soit accessible dans le bloc finally
  try {
    // Fonction pour générer une réponse avec Gemini
    const generateResponseWithHistory = async (content, author) => {
      // Vérifier si on a déjà répondu à cet auteur récemment
      if (!canReplyTo(author, history)) {
        logger.info(`Déjà répondu à ${author} il y a moins de 15 jours, on ignore.`);
        return null;
      }

      logger.info(`Génération d'une réponse avec Gemini pour ${author} au sujet de "${content.substring(0, 50)}..."`);

      // Générer la réponse avec l'API Gemini
      const generatedResponse = await contentGenerator.generateReply(content, author);

      if (generatedResponse) {
        logger.info(`Réponse générée: ${generatedResponse.substring(0, 50)}...`);

        // Enregistrer dans l'historique (on utilisera un ID fictif puisqu'on n'a pas l'URL)
        const historyKey = `${author}-${Date.now()}`;
        history[historyKey] = {
          author: author,
          date: new Date().toISOString(),
          responded: true
        };
        saveHistory(history);

        return generatedResponse;
      }

      return null;
    };

    // Répond maintenant aux messages du fil d'accueil (home)
    const repliesCount = await socialActions.replyOnHomeTimeline(
      generateResponseWithHistory, // Fonction pour générer les réponses
      1                           // Maximum 3 réponses par cycle
      // Vous pouvez ajouter un tableau de mots-clés ici si besoin
    );
    nbReplies = repliesCount;
    // Vérifier si la fonctionnalité de suivi est activée dans la configuration
    const config = (await import('./config/index.js')).default;

    if (config.features?.userFollowing) {
      // Après avoir répondu aux messages, faire une recherche et follow d'un utilisateur si activé
      logger.info('Début de la recherche et follow d\'utilisateurs crypto...');
      // Réinitialiser followCount
      followCount = 0;

      try {
        // Chercher uniquement "crypto" et suivre 1 personne pour le test
        followCount = await socialActions.searchAndFollowUsers(
          ['crypto'],  // Uniquement le mot-clé crypto pour le test
          1,           // Suivre seulement 1 personne
          30           // Ne pas suivre à nouveau avant 30 jours
        );
        logger.info(`Test de follow terminé. Utilisateurs suivis: ${followCount}`);
      } catch (followErr) {
        logger.error('Erreur lors du test de follow :', followErr);
      }
    } else {
      logger.info('Fonctionnalité de suivi désactivée dans la configuration, étape de suivi ignorée.');
    }
  } catch (err) {
    logger.error('Erreur dans le job de réponse automatique :', err);
  } finally {
    await socialActions.close();
    logger.info(`Fin du job planifié. Réponses envoyées: ${nbReplies}, follows: ${followCount || 0}`);
    // Marquer la tâche comme terminée
    runningTasks.replyTask = false;
  }
});

// Tâche pour suivre automatiquement des utilisateurs toutes les minutes
cron.schedule('*/5 * * * *', async () => {
  // Vérifier si la fonctionnalité de suivi est activée dans la configuration
  const config = (await import('./config/index.js')).default;

  if (!config.features?.userFollowing) {
    logger.info('Fonctionnalité de suivi désactivée dans la configuration, tâche annulée.');
    return;
  }

  // Ne pas exécuter si cette tâche est déjà en cours ou si une autre tâche utilise le navigateur
  if (runningTasks.followTask || isBrowserLocked()) {
    logger.info('Une tâche est déjà en cours d\'exécution ou le navigateur est verrouillé. Planification de la tâche de follow ignorée.');
    return;
  }

  // Marquer la tâche comme en cours
  runningTasks.followTask = true;

  logger.info('Début du job planifié : recherche et follow automatique d\'utilisateurs...');
  let followCount = 0;

  try {
    // Suivre jusqu'à 5 nouveaux utilisateurs qui parlent de crypto ou technologies liées
    followCount = await socialActions.searchAndFollowUsers(
      ['bitcoin', 'web3', 'crypto', 'blockchain', 'nft'],  // mots-clés pertinents
      5,                                                   // max 5 follows par jour
      30                                                   // ne pas suivre à nouveau avant 30 jours
    );
  } catch (err) {
    logger.error('Erreur dans le job de follow automatique :', err);
  } finally {
    await socialActions.close();
    logger.info(`Fin du job de follow. Utilisateurs suivis: ${followCount}`);
    // Marquer la tâche comme terminée
    runningTasks.followTask = false;
  }
});


export function initializeScheduler() {
  logger.info('Planificateur de tâches initialisé (cron jobs actifs)');
}
