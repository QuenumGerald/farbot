// Ce fichier est conservé pour la rétrocompatibilité
// Utilisez désormais directement le logger depuis src/config/logger.js

const logger = require('../config/logger');

// Fonction utilitaire pour créer des loggers enfants avec un contexte
logger.child = (context) => {
  return logger.child(context);
};

module.exports = logger;
