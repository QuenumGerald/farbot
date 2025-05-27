import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import config from './index.js';

const { format, transports } = winston;
const { combine, timestamp, printf, colorize, json, errors } = format;

// Equivalent à __dirname en CommonJS
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Créer le dossier de logs s'il n'existe pas
const logDir = path.resolve(process.cwd(), config.logging.directory || 'logs');

// Format personnalisé pour la sortie console
const consoleFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  // Extraire les métadonnées pour un affichage plus propre
  const metaWithoutCommon = Object.keys(meta)
    .filter(key => !['service', 'timestamp', 'module'].includes(key))
    .reduce((obj, key) => {
      obj[key] = meta[key];
      return obj;
    }, {});
  
  const metaString = Object.keys(metaWithoutCommon).length 
    ? `\n${JSON.stringify(metaWithoutCommon, null, 2)}` 
    : '';
  
  const stackString = stack ? `\n${stack}` : '';
  const serviceString = meta.service ? `[${meta.service}]` : '';
  const moduleString = meta.module ? `[${meta.module}]` : '';
  const prefix = [serviceString, moduleString].filter(Boolean).join(' ');
  
  return `${timestamp} ${level}: ${prefix} ${message}${metaString}${stackString}`.trim();
});

// Configuration des transports
const transportsList = [
  // Fichier d'erreurs
  new transports.File({
    filename: path.join(logDir, config.logging.files.error || 'error.log'),
    level: 'error',
    format: combine(
      timestamp({ format: config.logging.dateFormat }),
      errors({ stack: true }),
      json()
    ),
    maxsize: config.logging.maxSize || 10 * 1024 * 1024, // 10MB par défaut
    maxFiles: config.logging.maxFiles || 5,
  }),
  // Fichier de logs combinés
  new transports.File({
    filename: path.join(logDir, config.logging.files.combined || 'combined.log'),
    format: combine(
      timestamp({ format: config.logging.dateFormat }),
      errors({ stack: true }),
      json()
    ),
    maxsize: config.logging.maxSize || 10 * 1024 * 1024,
    maxFiles: config.logging.maxFiles || 5,
  })
];

// En développement, on ajoute aussi la sortie console avec des couleurs
if (config.server.isDevelopment) {
  transportsList.push(
    new transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: config.logging.dateFormat }),
        errors({ stack: config.logging.level === 'debug' }),
        consoleFormat
      )
    })
  );
}

// En production, on peut aussi vouloir un fichier de debug séparé
if (config.server.isProduction && config.logging.files.debug) {
  transportsList.push(
    new transports.File({
      filename: path.join(logDir, config.logging.files.debug),
      level: 'debug',
      format: combine(
        timestamp({ format: config.logging.dateFormat }),
        errors({ stack: true }),
        json()
      ),
      maxsize: config.logging.maxSize || 10 * 1024 * 1024,
      maxFiles: config.logging.maxFiles || 5,
    })
  );
}

// Création du logger principal
const logger = winston.createLogger({
  level: config.logging.level || 'info',
  defaultMeta: { 
    service: 'app',
    env: config.server.nodeEnv 
  },
  format: combine(
    timestamp({ format: config.logging.dateFormat }),
    errors({ stack: true }),
    json()
  ),
  transports: transportsList,
  exitOnError: false
});

// Gestion des rejets de promesses non gérés
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', { 
    error: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined
  });
});

// Gestion des exceptions non capturées
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', { 
    error: error.message,
    stack: error.stack,
    code: error.code
  });
  
  // En production, on laisse le processus se terminer pour être relancé par PM2 ou un gestionnaire de processus
  if (config.server.isProduction) {
    // On attend que les logs soient écrits avant de terminer
    setTimeout(() => process.exit(1), 1000);
  }
});

// Fonction utilitaire pour créer des loggers enfants avec un contexte spécifique
logger.child = (context) => {
  if (!context || (typeof context !== 'object' && typeof context !== 'string')) {
    return logger;
  }
  
  const childContext = typeof context === 'string' 
    ? { module: context } 
    : context;
    
  return winston.createLogger({
    ...logger,
    defaultMeta: { 
      ...logger.defaultMeta,
      ...childContext
    }
  });
}

// Fonction utilitaire pour créer un logger pour un module spécifique
export function module(moduleName) {
  return logger.child({ module: moduleName });
}

// Fonction utilitaire pour créer un nouveau logger
export function createLogger(moduleName) {
  return logger.child({ module: moduleName });
}

export default logger;
