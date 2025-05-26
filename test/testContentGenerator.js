import contentGenerator from '../src/services/contentGenerator.js';

async function testContentGeneration() {
  try {
    console.log('Début du test de génération de contenu...');
    
    // Générer un message
    const message = await contentGenerator.generatePost();
    
    console.log('\n=== Message généré avec succès ===');
    console.log(message);
    console.log('\nLongueur du message:', message.length, 'caractères');
    
    process.exit(0);
  } catch (error) {
    console.error('Erreur lors de la génération du message:', error);
    process.exit(1);
  }
}

// Lancer le test
testContentGeneration();
