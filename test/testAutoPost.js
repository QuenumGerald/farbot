import ClippyBot from '../src/bot/clippy.js';
import winston from 'winston';

// Configuration du logger pour les tests
const logger = winston.createLogger({
  level: 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.simple()
  ),
  transports: [
    new winston.transports.Console()
  ]
});

logger.info('Démarrage du test de publication automatique...');

async function testAutoPost() {
  try {
    logger.info('Début du test de publication automatique');
    
    // Initialiser le bot
    const clippy = new ClippyBot();
    
    // Générer et publier un message
    const result = await clippy.publishAutoMessage();
    
    logger.info('Test réussi !');
    console.log('Message publié avec succès !');
    console.log('Hash:', result.hash);
    console.log('URL:', `https://warpcast.com/~/conversations/${result.hash}`);
    
    process.exit(0);
  } catch (error) {
    logger.error('Erreur lors du test de publication automatique:', error);
    process.exit(1);
  }
}

// Lancer le test
testAutoPost();
