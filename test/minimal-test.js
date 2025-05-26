// Script de test minimal ESM compatible
import ClippyBot from '../src/bot/clippy.js';
import dotenv from 'dotenv';

// Initialiser les variables d'environnement
dotenv.config();

async function main() {
  try {
    console.log('Initialisation de ClippyBot...');
    const bot = new ClippyBot();
    
    // Test de publication d'un post auto-généré
    console.log('Génération et publication d\'un post...');
    await bot.publishAutoPost();
    console.log('Post publié avec succès !');
    
    // Vous pouvez ajouter d'autres tests ici
    
  } catch (error) {
    console.error('Erreur lors du test :', error);
  }
}

main();
