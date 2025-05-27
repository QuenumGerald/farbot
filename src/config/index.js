import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

/**
 * Crée un objet de configuration basé sur les variables d'environnement fournies
 * @param {Object} env - L'objet contenant les variables d'environnement (par défaut process.env)
 * @returns {Object} - La configuration complète
 */
export function createConfig(env = process.env) {
  // Valider les variables d'environnement requises
  const requiredVars = ['GOOGLE_API_KEY', 'NEYNAR_API_KEY', 'NEYNAR_SIGNER_UUID', 'BOT_HANDLE'];
  const missingVars = requiredVars.filter(varName => !env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(`Erreur de configuration: Les variables d'environnement suivantes sont manquantes : ${missingVars.join(', ')}`);
  }

  // Créer le répertoire de logs s'il n'existe pas
  const logDir = path.resolve(process.cwd(), 'logs');
  if (!fs.existsSync(logDir)) {
    try {
      fs.mkdirSync(logDir, { recursive: true });
    } catch (error) {
      console.error('Impossible de créer le répertoire de logs :', error);
    }
  }

  return {
    // Configuration du serveur
    server: {
      port: env.PORT || 3000,
      nodeEnv: env.NODE_ENV || 'development',
      isProduction: env.NODE_ENV === 'production',
      isDevelopment: env.NODE_ENV === 'development',
    },
    
    // Configuration du bot
    bot: {
      handle: env.BOT_HANDLE || '@clippy',
      displayName: env.BOT_DISPLAY_NAME || 'Clippy',
      bio: env.BIO || '🤖 Bot assistant Farcaster propulsé par Gemini',
      // Délai entre les vérifications de mentions (en ms)
      mentionCheckInterval: env.MENTION_CHECK_INTERVAL 
        ? parseInt(env.MENTION_CHECK_INTERVAL, 10) 
        : 5 * 60 * 1000, // 5 minutes par défaut
    },
    
    // Configuration de Google Gemini
    gemini: {
      apiKey: env.GOOGLE_API_KEY,
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
      apiKey: env.NEYNAR_API_KEY,
      signerUuid: env.NEYNAR_SIGNER_UUID,
      apiUrl: env.NEYNAR_API_URL || 'https://api.neynar.com',
    },
    
    // Configuration de la base de données
    database: {
      client: 'sqlite3',
      connection: {
        filename: env.DATABASE_URL ? 
          env.DATABASE_URL.replace('sqlite:', '') : 
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
      level: env.LOG_LEVEL || (env.NODE_ENV === 'production' ? 'info' : 'debug'),
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
}

// Création de la configuration par défaut avec process.env
const config = createConfig();

// Export par défaut pour utilisation dans les imports
export default config;
