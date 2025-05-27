// Fichier de démarrage pour Render
import { initializeBot } from './bot/index.js';
import { initializeScheduler } from './jobs/scheduler.js';

// Pour capturer les erreurs fatales
process.on('uncaughtException', (err) => {
  console.error('ERREUR FATALE NON CAPTURÉE :', err);
  // Ne pas quitter - laisser le processus continuer
});

process.on('unhandledRejection', (err) => {
  console.error('PROMESSE REJETÉE NON GÉRÉE :', err);
  // Ne pas quitter - laisser le processus continuer
});

// Fonction principale qui démarre tout
async function startApp() {
  console.log('🚀 DÉMARRAGE DE CLIPPY BOT (version Render)...');
  
  try {
    // 1. Initialiser le bot
    console.log('Initialisation du bot...');
    const bot = await initializeBot();
    console.log('✅ Bot initialisé avec succès!');
    
    // 2. Initialiser le scheduler
    try {
      console.log('Initialisation du planificateur...');
      const schedulerResult = await initializeScheduler(bot);
      console.log('✅ Planificateur initialisé:', schedulerResult);
    } catch (schedulerError) {
      console.error('❌ Erreur scheduler, mais on continue:', schedulerError);
      // Ne pas planter complètement si le scheduler échoue
    }
    
    console.log('🟢 APPLICATION DÉMARRÉE ET OPÉRATIONNELLE');
  } catch (error) {
    console.error('❌ ERREUR AU DÉMARRAGE:', error);
    // Ne pas quitter - on laisse le processus en vie
  }
}

// Démarrer l'application
startApp();

// Garder le processus en vie quoi qu'il arrive
setInterval(() => {
  console.log('Bot toujours en vie -', new Date().toISOString());
}, 1800000); // Log toutes les 30 minutes pour montrer que le bot est vivant
