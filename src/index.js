import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import cors from 'cors';
import path from 'path';
import fs from 'fs';

// Configuration et utilitaires
import config from './config/index.js';
import { createLogger } from './config/logger.js';
const logger = createLogger('app');
import ErrorHandler from './utils/errorHandler.js';

// Gestion du bot et des tâches
import { initializeBot, shutdownBot } from './bot/index.js';
import { initializeScheduler } from './jobs/scheduler.js';

// Initialisation de l'application Express
const app = express();
const PORT = config.server.port;

// Middleware de base
app.use(helmet()); // Sécurisation des en-têtes HTTP
app.use(compression()); // Compression des réponses
app.use(cors()); // Gestion des CORS
app.use(express.json({ limit: '10kb' })); // Parser JSON avec une limite de taille
app.use(express.urlencoded({ extended: true, limit: '10kb' })); // Parser les données de formulaire

// Route de santé (utile pour les vérifications de disponibilité)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: config.bot.displayName,
    version: process.env.npm_package_version || 'development',
    environment: config.server.nodeEnv
  });
});

// Gestion des erreurs 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route non trouvée'
  });
});

// Gestionnaire d'erreurs global
app.use(ErrorHandler.middleware());

// Gestion des erreurs non capturées
ErrorHandler.init(process);

// Référence au bot pour l'arrêt gracieux
let botInstance = null;

async function start() {
  try {
    logger.info('🚀 Démarrage de Clippy Bot...');
    
    // Vérifier que le répertoire de données existe
    const dataDir = path.resolve(process.cwd(), './data');
    if (!fs.existsSync(dataDir)) {
      logger.debug(`Création du répertoire de données: ${dataDir}`);
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Initialiser le bot
    logger.debug('Initialisation du bot...');
    botInstance = await initializeBot();
    
    // Initialiser le planificateur de tâches
    logger.debug('Initialisation du planificateur de tâches...');
    await initializeScheduler(botInstance);
    
    // Fonction d'arrêt gracieux globale
    global.shutdown = async () => {
      await gracefulShutdown();
    };
    
    // Démarrer le serveur
    const server = app.listen(PORT, () => {
      logger.info(`🚀 Bot ${config.bot.displayName} démarré sur le port ${PORT}`);
      logger.info(`🤖 En écoute sur ${config.bot.handle}`);
      logger.info(`🌐 API disponible sur: http://localhost:${PORT}/health`);
      
      if (config.server.isDevelopment) {
        logger.debug('Mode développement activé, logs verbeux activés');
      }
    });
    
    // Gestion de l'arrêt gracieux du serveur
    server.on('close', () => {
      logger.info('Serveur HTTP arrêté');
    });
    
    return { app, server, bot: botInstance };
  } catch (error) {
    logger.error('Erreur critique lors du démarrage de l\'application:', { 
      error: error.message, 
      stack: error.stack 
    });
    process.exit(1);
  }
}

/**
 * Arrêt gracieux de l'application
 * @returns {Promise<void>}
 */
async function gracefulShutdown() {
  logger.info('Arrêt gracieux en cours...');
  
  try {
    // Arrêt du bot
    if (botInstance) {
      logger.debug('Arrêt du bot...');
      await shutdownBot();
    }
    
    // Arrêt du planificateur de tâches (si méthode disponible)
    if (typeof global.jobScheduler?.stop === 'function') {
      logger.debug('Arrêt du planificateur de tâches...');
      await global.jobScheduler.stop();
    }
    
    logger.info('Arrêt gracieux terminé avec succès');
  } catch (error) {
    logger.error('Erreur lors de l\'arrêt gracieux:', { 
      error: error.message, 
      stack: error.stack 
    });
  }
}

// Gestion des signaux de terminaison
const signals = ['SIGTERM', 'SIGINT', 'SIGUSR2'];

signals.forEach(signal => {
  process.on(signal, async () => {
    logger.info(`Signal reçu: ${signal}. Arrêt gracieux en cours...`);
    
    // Lancer l'arrêt gracieux
    if (typeof global.shutdown === 'function') {
      await global.shutdown();
    } else {
      await gracefulShutdown();
    }
    
    // Sortir avec un code de succès
    const exitCode = signal === 'SIGUSR2' ? 1 : 0; // Pour nodemon restart
    process.exit(exitCode);
  });
});

// Démarrer l'application si appelé directement
if (import.meta.url === process.argv[1] || import.meta.url === `file://${process.argv[1]}`) {
  logger.info(`🔔 Démarrage de l'application en mode ${config.server.nodeEnv}`);
  
  start().catch((error) => {
    logger.error('Erreur fatale lors du démarrage:', { 
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  });
}

export { app, start, gracefulShutdown };
