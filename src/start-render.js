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
console.log('🟢 KEEPALIVE HEARTBEAT DÉMARRÉ');

// Créer un fichier keepalive.txt dans le répertoire racine
const fs = require('fs');
const path = require('path');
try {
  const keepalivePath = path.join(process.cwd(), 'keepalive.txt');
  fs.writeFileSync(keepalivePath, `Bot started at ${new Date().toISOString()}\n`);
  console.log('Fichier keepalive créé:', keepalivePath);
} catch (err) {
  console.error('Erreur en créant keepalive.txt:', err);
}

// Triple sécurité : lier le processus à stdin, stdout et setInterval
process.stdin.resume(); // Empêche Node de quitter

const keepaliveInterval = setInterval(() => {
  try {
    console.log('🟢 Bot toujours en vie -', new Date().toISOString());
    fs.appendFileSync(path.join(process.cwd(), 'keepalive.txt'), `Heartbeat: ${new Date().toISOString()}\n`);
  } catch (e) {
    console.error('Erreur heartbeat:', e);
  }
}, 900000); // Log toutes les 15 minutes

// S'assurer que le timer ne bloque pas Node.js de se terminer proprement
keepaliveInterval.unref();

// Signal handlers pour arrêt propre si demandé
process.on('SIGINT', () => {
  console.log('Signal SIGINT reçu, arrêt du bot...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Signal SIGTERM reçu, arrêt du bot...');
  process.exit(0);
});
