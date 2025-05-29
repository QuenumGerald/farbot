import socialActions from '../src/services/socialActions.js';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

/**
 * Exemple d'utilisation du service SocialActions
 */
async function exampleUsage() {
  try {
    console.log('🔍 Recherche de messages contenant "bitcoin"...');
    
    // 1. Rechercher des messages
    const messages = await socialActions.searchMessages('bitcoin');
    
    if (messages.length === 0) {
      console.log('Aucun message trouvé.');
      return;
    }
    
    console.log(`✅ ${messages.length} messages trouvés :`);
    messages.forEach((msg, index) => {
      console.log(`\n--- Message ${index + 1} ---`);
      console.log(`Auteur: ${msg.author}`);
      console.log(`Contenu: ${msg.content.substring(0, 100)}...`);
      console.log(`URL: ${msg.url}`);
    });
    
    // 2. Répondre au premier message trouvé (décommenter pour tester)
    /*
    console.log('\n💬 Envoi d\'une réponse...');
    const success = await socialActions.replyToMessage(
      messages[0].url,
      'Merci pour ce partage intéressant sur Bitcoin ! 🚀'
    );
    console.log(success ? '✅ Réponse envoyée avec succès !' : '❌ Échec de l\'envoi de la réponse');
    */
    
  } catch (error) {
    console.error('❌ Erreur :', error);
  } finally {
    // Toujours fermer la page à la fin
    await socialActions.close();
    console.log('\n👋 Fermeture du navigateur');
  }
}

// Lancer l'exemple
exampleUsage();
