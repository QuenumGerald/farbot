import cron from 'node-cron';
import socialActions from './services/socialActions.js';
import contentGenerator from './services/contentGenerator.js';
import { createLogger } from './config/logger.js';
import fs from 'fs';
import path from 'path';

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

cron.schedule('* * * * *', async () => {
  logger.info('Début du job planifié : recherche et réponse automatique aux messages...');
  const history = loadHistory();
  let nbReplies = 0;
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
    
    // Utiliser la nouvelle fonction searchAndReplyInline
    // Recherche et répond directement aux messages sur la page de recherche
    const repliesCount = await socialActions.searchAndReplyInline(
      'bitcoin',          // Mot-clé de recherche
      'recent',           // Type de recherche
      generateResponseWithHistory,  // Fonction pour générer les réponses
      3                   // Maximum 3 réponses par cycle
    );
    
    nbReplies = repliesCount;
  } catch (err) {
    logger.error('Erreur dans le job de réponse automatique :', err);
  } finally {
    await socialActions.close();
    logger.info(`Fin du job planifié. Réponses envoyées: ${nbReplies}`);
  }
});


export function initializeScheduler() {
  logger.info('Planificateur de tâches initialisé (cron jobs actifs)');
}
