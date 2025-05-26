// Script CommonJS ultra simplifié
require('dotenv').config();
const { NeynarV1APIClient } = require('@neynar/nodejs-sdk');

async function testNeynar() {
  try {
    console.log('Initialisation du client Neynar...');
    const client = new NeynarV1APIClient(process.env.NEYNAR_API_KEY);
    
    // Récupérer des casts récents via l'API directement
    const castApi = client.apis.cast;
    
    console.log('Récupération des casts récents...');
    // Explorons les méthodes disponibles
    console.log('Méthodes disponibles dans castApi:', Object.keys(castApi));
    
    // Essayons de récupérer des casts par l'API directe
    const response = await castApi.searchCast({ q: 'ethereum', limit: 5 });
    
    if (response.data && response.data.casts) {
      const casts = response.data.casts;
      console.log(`\n${casts.length} casts trouvés:`);
      
      casts.forEach((cast, idx) => {
        console.log(`\n[${idx + 1}] Auteur: ${cast.author?.username || cast.author?.fid}`);
        console.log(`Texte: ${cast.text?.substring(0, 100)}${cast.text?.length > 100 ? '...' : ''}`);
        console.log(`Hash: ${cast.hash}`);
      });
    } else {
      console.log('Aucun cast trouvé ou format de réponse inattendu:', response);
    }
    
  } catch (error) {
    console.error('Erreur:', error.message);
    if (error.response) {
      console.error('Détails API:', error.response.data);
    }
  }
}

testNeynar();
