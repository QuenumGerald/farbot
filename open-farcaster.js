// Fichier temporaire pour ouvrir Puppeteer sur Farcaster
import { getFarcasterPage } from './src/services/login.js';

console.log('Ouverture de la fenêtre Puppeteer pour Farcaster...');
getFarcasterPage().then(() => {
  console.log('Fenêtre Puppeteer ouverte. Connectez-vous à Farcaster si besoin.');
}).catch(error => {
  console.error('Erreur lors de l\'ouverture de Puppeteer:', error);
});
