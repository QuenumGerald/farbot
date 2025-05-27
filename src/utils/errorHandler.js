import { createLogger } from '../config/logger.js';
const logger = createLogger('errorHandler');

class ErrorHandler {
  static init(process) {
    // Gestion des erreurs non capturées
    process.on('uncaughtException', (error) => {
      logger.error('Erreur non capturée:', error);
      // Ne pas arrêter le processus en développement pour permettre le débogage
      if (process.env.NODE_ENV === 'production') {
        process.exit(1);
      }
    });

    // Gestion des promesses non gérées
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Promesse non gérée rejetée:', { reason, promise });
    });

    // Gestion des signaux de terminaison
    const signals = ['SIGINT', 'SIGTERM', 'SIGQUIT'];
    signals.forEach((signal) => {
      process.on(signal, async () => {
        logger.info(`Reçu ${signal}. Arrêt gracieux du bot...`);
        
        try {
          // Nettoyage avant arrêt (fermeture des connexions, etc.)
          if (typeof global.shutdown === 'function') {
            await global.shutdown();
          }
          
          logger.info('Arrêt terminé. Au revoir ! 👋');
          process.exit(0);
        } catch (error) {
          logger.error('Erreur lors de l\'arrêt gracieux:', error);
          process.exit(1);
        }
      });
    });
  }

  // Middleware pour Express
  static middleware() {
    return (err, req, res, next) => {
      logger.error('Erreur API:', {
        error: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : {},
        path: req.path,
        method: req.method,
        body: req.body,
        params: req.params,
        query: req.query,
      });

      const statusCode = err.statusCode || 500;
      const response = {
        success: false,
        message: err.message || 'Une erreur est survenue',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
      };

      res.status(statusCode).json(response);
    };
  }
}

export default ErrorHandler;
