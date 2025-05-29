console.log('>>> Début absolu de index.js');
import dotenv from 'dotenv';
console.log('>>> Après import dotenv');
dotenv.config();
console.log('>>> Après dotenv.config()');
import express from 'express';
console.log('>>> Après import express');
import path from 'path';
console.log('>>> Après import path');
import { fileURLToPath } from 'url';
console.log('>>> Après import fileURLToPath');
import { createLogger } from './config/logger.js';
console.log('>>> Après import createLogger');
import { getFarcasterPage } from './services/login.js';
console.log('>>> Après import getFarcasterPage');
import { initializeScheduler } from './scheduler.js';
console.log('>>> Après import initializeScheduler');

const logger = createLogger('app');
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Initialisation de l'application Express
const app = express();

// Middleware de base
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Route de santé
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV
  });
});

// Gestion des erreurs 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route non trouvée'
  });
});

// Gestion des erreurs non capturées
ErrorHandler.init(process);

// Référence au bot pour l'arrêt gracieux
let botInstance = null;

async function start() {
  try {
    console.log('>>> [DEBUG] Entrée dans start()');
  } catch (e) {
    console.error('>>> [ERREUR] Exception tout début de start():', e);
  }
  console.log('>>> Début de start()');
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
    
    // Ouvre Puppeteer même si la recherche est désactivée
    console.log('>>> Avant getFarcasterPage()');
    await getFarcasterPage();
    console.log('>>> Après getFarcasterPage()');
    
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

// Démarrage direct du bot à chaque exécution
start().catch((error) => {
  console.error('Erreur fatale lors du démarrage:', error);
  process.exit(1);
});

export { app, start, gracefulShutdown };

// Démarrage effectif du bot (ouvre Puppeteer)
console.log('>>> AVANT start() tout en bas');
start().catch((error) => {
  console.error('Erreur fatale lors du démarrage:', error);
  process.exit(1);
});
