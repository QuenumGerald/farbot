import { BlazeJob } from 'blazerjob';
import path from 'path';
import config from '../config/index.js';
import { createLogger } from '../config/logger.js';
const logger = createLogger('jobs');

// Définir le chemin de la base de données SQLite
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const rawPath = resolve(__dirname, '../', config.database.connection.filename);
const dbDir = path.dirname(rawPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
  console.log('📁 Dossier DB créé automatiquement :', dbDir);
} else {
  console.log('📁 Dossier DB déjà présent :', dbDir);
}

const dbPath = rawPath;
// Initialisation du planificateur de tâches avec BlazeJob
const blazeJob = new BlazeJob({
  dbPath,
  autoExit: false,  // Ne pas quitter automatiquement
  verbose: config.server.isDevelopment
});

// Référence globale pour y accéder de l'extérieur
global.jobScheduler = blazeJob;

// Suivre l'état des tâches
const jobsState = {
  running: new Set(),
  completed: new Set(),
  failed: new Set()
};

/**
 * Enregistre une nouvelle tâche de type "custom" avec un handler personnalisé
 * @param {string} name - Identifiant unique pour la tâche
 * @param {Function} taskFn - Fonction à exécuter
 * @param {Object} options - Options de planification
 * @param {Date|string} options.runAt - Date d'exécution (si non récurrente)
 * @param {string} [options.cronSchedule] - Expression cron pour les tâches récurrentes
 * @param {number} [options.interval] - Intervalle en ms pour les tâches récurrentes
 * @param {number} [options.maxRuns] - Nombre maximum d'exécutions
 * @param {number} [options.priority=0] - Priorité de la tâche (plus élevé = plus prioritaire)
 * @param {number} [options.timeout=60000] - Délai d'expiration en ms
 * @returns {Promise<number>} ID de la tâche planifiée
 */
async function scheduleCustomTask(name, taskFn, options = {}) {
  const {
    runAt = new Date(),
    cronSchedule,
    interval,
    maxRuns,
    priority = 0,
    timeout = 60000,
    description
  } = options;

  const jobLogger = logger.child({ job: name });

  // Wrapper pour le traitement des erreurs et la gestion du timeout
  const wrappedTaskFn = async () => {
    const taskId = Math.random().toString(36).substring(2, 15);
    jobsState.running.add(taskId);

    const startTime = Date.now();
    jobLogger.info(`Début d'exécution: ${name}`, { taskId });

    try {
      // Ajouter un timeout à la tâche
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Tâche '${name}' terminée par timeout après ${timeout}ms`));
        }, timeout);
      });

      // Exécuter la tâche avec un timeout
      const result = await Promise.race([
        taskFn(),
        timeoutPromise
      ]);

      const duration = Date.now() - startTime;
      jobLogger.info(`Tâche '${name}' terminée avec succès en ${duration}ms`, { taskId });

      jobsState.running.delete(taskId);
      jobsState.completed.add(taskId);

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      jobLogger.error(`Échec de la tâche '${name}' après ${duration}ms:`, {
        error: error.message,
        stack: error.stack,
        taskId
      });

      jobsState.running.delete(taskId);
      jobsState.failed.add(taskId);

      throw error;
    }
  };

  // Préparer les options pour BlazeJob
  const blazeJobOptions = {
    runAt: typeof runAt === 'string' ? new Date(runAt) : runAt,
    priority
  };

  // Ajouter l'intervalle si présent
  if (interval && interval > 0) {
    blazeJobOptions.interval = interval;
  }

  // Ajouter le nombre maximum d'exécutions si spécifié
  if (maxRuns && maxRuns > 0) {
    blazeJobOptions.maxRuns = maxRuns;
  }

  // Ajouter le callback de fin d'exécution
  blazeJobOptions.onEnd = (stats) => {
    jobLogger.info(`Tâche '${name}' terminée définitivement`, { stats });
  };

  // Planifier la tâche avec BlazeJob
  try {
    const taskId = blazeJob.schedule(wrappedTaskFn, blazeJobOptions);
    jobLogger.info(`Tâche '${name}' planifiée avec succès`, {
      taskId,
      runAt: blazeJobOptions.runAt,
      interval: blazeJobOptions.interval,
      description
    });
    return taskId;
  } catch (error) {
    jobLogger.error(`Erreur lors de la planification de la tâche '${name}':`, error);
    throw error;
  }
}

/**
 * Planifie une tâche HTTP (requête API)
 * @param {string} name - Identifiant de la tâche
 * @param {Object} httpConfig - Configuration de la requête HTTP
 * @param {string} httpConfig.url - URL de la requête
 * @param {string} httpConfig.method - Méthode HTTP (GET, POST, etc.)
 * @param {Object} [httpConfig.headers] - En-têtes HTTP
 * @param {Object} [httpConfig.body] - Corps de la requête (pour POST/PUT)
 * @param {Object} options - Options de planification (mêmes options que scheduleCustomTask)
 * @returns {Promise<number>} ID de la tâche planifiée
 */
async function scheduleHttpTask(name, httpConfig, options = {}) {
  const jobLogger = logger.child({ job: name, type: 'http' });

  // Validation de base
  if (!httpConfig.url) {
    throw new Error(`URL requise pour la tâche HTTP '${name}'`);
  }

  // Préparer les options pour BlazeJob
  const blazeJobOptions = {
    runAt: options.runAt ? (typeof options.runAt === 'string' ? new Date(options.runAt) : options.runAt) : new Date(),
    type: 'http',
    config: JSON.stringify(httpConfig),
    priority: options.priority || 0
  };

  // Ajouter l'intervalle si présent
  if (options.interval && options.interval > 0) {
    blazeJobOptions.interval = options.interval;
  }

  // Ajouter le nombre maximum d'exécutions si spécifié
  if (options.maxRuns && options.maxRuns > 0) {
    blazeJobOptions.maxRuns = options.maxRuns;
  }

  // Fonction vide car BlazeJob va exécuter la requête HTTP en fonction du type et de la config
  const emptyFn = async () => { };

  try {
    const taskId = blazeJob.schedule(emptyFn, blazeJobOptions);
    jobLogger.info(`Tâche HTTP '${name}' planifiée avec succès`, {
      taskId,
      url: httpConfig.url,
      method: httpConfig.method,
      runAt: blazeJobOptions.runAt,
      interval: blazeJobOptions.interval
    });
    return taskId;
  } catch (error) {
    jobLogger.error(`Erreur lors de la planification de la tâche HTTP '${name}':`, error);
    throw error;
  }
}

/**
 * Planifie une tâche récurrente basée sur une expression cron
 * @param {string} name - Identifiant de la tâche
 * @param {string} cronExpression - Expression cron (ex: "0 9 * * *")
 * @param {Function} taskFn - Fonction à exécuter
 * @param {Object} options - Options supplémentaires
 * @returns {Promise<number>} ID de la tâche planifiée
 */
async function scheduleCronTask(name, cronExpression, taskFn, options = {}) {
  // Calculer la prochaine date d'exécution selon l'expression cron
  const nextRunDate = calculateNextCronRun(cronExpression);

  if (!nextRunDate) {
    throw new Error(`Expression cron invalide: ${cronExpression}`);
  }

  const jobLogger = logger.child({ job: name, type: 'cron' });
  jobLogger.info(`Prochaine exécution de la tâche cron '${name}': ${nextRunDate.toISOString()}`);

  // Planifier la tâche à exécuter à la prochaine date calculée
  const taskId = await scheduleCustomTask(name, async () => {
    try {
      // Exécuter la fonction
      await taskFn();

      // Replanifier pour la prochaine occurrence
      const nextDate = calculateNextCronRun(cronExpression);
      if (nextDate) {
        await scheduleCronTask(name, cronExpression, taskFn, options);
      }
    } catch (error) {
      jobLogger.error(`Erreur lors de l'exécution de la tâche cron '${name}':`, error);

      // Replanifier malgré l'erreur pour la prochaine occurrence
      const nextDate = calculateNextCronRun(cronExpression);
      if (nextDate) {
        await scheduleCronTask(name, cronExpression, taskFn, options);
      }
    }
  }, {
    ...options,
    runAt: nextRunDate
  });

  return taskId;
}

/**
 * Calcule la prochaine date d'exécution selon une expression cron
 * @param {string} cronExpression - Expression cron
 * @returns {Date|null} Prochaine date d'exécution ou null si invalide
 */
function calculateNextCronRun(cronExpression) {
  try {
    // Implémentation simplifiée: pour une vraie application, utiliser node-cron ou cron-parser
    const [minute, hour, dayOfMonth, month, dayOfWeek] = cronExpression.split(' ');

    const now = new Date();
    const nextRun = new Date(now);

    // Traitement simple pour les expressions basiques comme "0 9 * * *" (tous les jours à 9h)
    if (minute === '0' && !isNaN(parseInt(hour))) {
      nextRun.setHours(parseInt(hour));
      nextRun.setMinutes(0);
      nextRun.setSeconds(0);
      nextRun.setMilliseconds(0);

      // Si l'heure est déjà passée aujourd'hui, passer au jour suivant
      if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 1);
      }

      return nextRun;
    }

    // Pour les cas plus complexes, on simule une heure plus tard pour les tests
    // Dans une vraie implémentation, utiliser une bibliothèque de cron
    logger.warn(`Expression cron complexe '${cronExpression}' non complètement supportée, utilisation d'une approximation`);
    nextRun.setHours(nextRun.getHours() + 1);
    return nextRun;
  } catch (error) {
    logger.error(`Erreur lors du calcul de la prochaine exécution cron:`, error);
    return null;
  }
}

/**
 * Initialise le planificateur et démarre l'exécution des tâches
 */
async function initializeScheduler() {
  try {
    logger.info('Initialisation du planificateur BlazeJob...');

    // Ajouter un écouteur pour les tâches terminées
    blazeJob.onAllTasksEnded(() => {
      logger.info('Toutes les tâches périodiques sont terminées');
    });

    // Démarrer le planificateur
    await blazeJob.start();

    logger.info('Planificateur BlazeJob démarré avec succès');
    return blazeJob;
  } catch (error) {
    logger.error('Erreur lors de l\'initialisation du planificateur:', error);
    throw error;
  }
}

/**
 * Arrête le planificateur de tâches
 */
async function stopScheduler() {
  try {
    if (blazeJob) {
      logger.info('Arrêt du planificateur BlazeJob...');
      await blazeJob.stop();
      logger.info('Planificateur BlazeJob arrêté avec succès');
    }
  } catch (error) {
    logger.error('Erreur lors de l\'arrêt du planificateur:', error);
    throw error;
  }
}

function getJobsState() {
  return {
    running: Array.from(jobsState.running),
    completed: Array.from(jobsState.completed),
    failed: Array.from(jobsState.failed),
  };
}

export {
  blazeJob,
  scheduleCustomTask,
  scheduleHttpTask,
  scheduleCronTask,
  initializeScheduler,
  stopScheduler,
  getJobsState
};
