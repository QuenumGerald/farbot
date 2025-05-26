import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Equivalent à __dirname en ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Charger les variables d'environnement
dotenv.config();

const config = {
  // Configuration du serveur
  server: {
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',
    isProduction: process.env.NODE_ENV === 'production',
    isDevelopment: process.env.NODE_ENV === 'development',
  },
  
  // Configuration du bot
  bot: {
    handle: process.env.BOT_HANDLE || '@clippy',
    displayName: process.env.BOT_DISPLAY_NAME || 'Clippy',
    bio: process.env.BIO || '🤖 Bot assistant Farcaster propulsé par Gemini',
    // Délai entre les vérifications de mentions (en ms)
    mentionCheckInterval: process.env.MENTION_CHECK_INTERVAL 
      ? parseInt(process.env.MENTION_CHECK_INTERVAL, 10) 
      : 5 * 60 * 1000, // 5 minutes par défaut
  },
  
  // Configuration de Google Gemini
  gemini: {
    apiKey: process.env.GOOGLE_API_KEY,
    model: 'gemini-2.0-flash-lite',
    // Paramètres de génération par défaut
    generationConfig: {
      temperature: 0.7,
      topP: 0.9,
      topK: 40,
      maxOutputTokens: 1024,
    },
  },
  
  // Configuration de Neynar
  neynar: {
    apiKey: process.env.NEYNAR_API_KEY,
    signerUuid: process.env.NEYNAR_SIGNER_UUID,
    apiUrl: process.env.NEYNAR_API_URL || 'https://api.neynar.com',
  },
  
  // Configuration de la base de données
  database: {
    client: 'sqlite3',
    connection: {
      filename: process.env.DATABASE_URL ? 
        process.env.DATABASE_URL.replace('sqlite:', '') : 
        './data/clippy.db',
    },
    useNullAsDefault: true,
    migrations: {
      directory: './migrations',
      tableName: 'knex_migrations',
    },
  },
  
  // Configuration des tâches planifiées
  jobs: {
    // Planification des tâches au format cron
    schedules: {
      dailyPost: '0 12 * * *', // Tous les jours à midi
      checkMentions: '*/5 * * * *', // Toutes les 5 minutes
    },
    // Nombre maximum de tentatives en cas d'échec
    maxAttempts: 3,
    // Délai entre les tentatives (en ms)
    backoffMs: 5000,
    // Configuration des verrous de tâches
    lock: {
      acquireTimeout: 10000, // 10 secondes
      timeout: 300000, // 5 minutes
      retries: 5,
      delay: 1000, // 1 seconde entre les tentatives
    },
  },
  
  // Configuration des logs
  logging: {
    // Niveau de log par défaut
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
    // Répertoire des fichiers de log
    directory: './logs',
    // Fichiers de log
    files: {
      error: 'error.log',
      combined: 'combined.log',
      debug: 'debug.log',
    },
    // Taille maximale des fichiers de log (en octets)
    maxSize: 10 * 1024 * 1024, // 10 Mo
    // Nombre maximum de fichiers à conserver
    maxFiles: 5,
    // Format des dates dans les logs
    dateFormat: 'YYYY-MM-DD HH:mm:ss',
  },
};

// Validation de la configuration
function validateConfig() {
  const requiredVars = [
    'GOOGLE_API_KEY',
    'NEYNAR_API_KEY',
    'NEYNAR_SIGNER_UUID',
    'BOT_HANDLE',
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    // En mode développement, on peut être plus permissif
    if (process.env.NODE_ENV !== 'development' || missingVars.length === requiredVars.length) {
      throw new Error(
        `Les variables d'environnement suivantes sont manquantes : ${missingVars.join(', ')}`
      );
    }
    console.warn(`Avertissement : Variables manquantes en mode développement : ${missingVars.join(', ')}`);
  }
  
  // Créer le répertoire de logs s'il n'existe pas
  const fs = require('fs');
  const path = require('path');
  const logDir = path.resolve(process.cwd(), 'logs');
  if (!fs.existsSync(logDir)) {
    try {
      fs.mkdirSync(logDir, { recursive: true });
    } catch (error) {
      console.error('Impossible de créer le répertoire de logs :', error);
    }
  }
  
  return true;
}

// Exécuter la validation au démarrage
try {
  validateConfig();
} catch (error) {
  console.error('Erreur de configuration:', error.message);
  process.exit(1);
}

export default config;
