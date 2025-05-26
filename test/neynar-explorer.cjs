// Script d'exploration de l'API Neynar pour comprendre sa structure
require('dotenv').config();
const { NeynarV1APIClient } = require('@neynar/nodejs-sdk');

async function exploreNeynarAPI() {
  try {
    console.log('Initialisation du client Neynar...');
    const client = new NeynarV1APIClient(process.env.NEYNAR_API_KEY);
    
    // Explorer la structure du client
    console.log('\n=== STRUCTURE DU CLIENT ===');
    console.log('Propriétés de niveau supérieur:', Object.keys(client));
    
    // Explorer les APIs disponibles
    if (client.apis) {
      console.log('\n=== APIS DISPONIBLES ===');
      Object.keys(client.apis).forEach(api => {
        console.log(`\nAPI ${api}:`);
        console.log('- Méthodes:', Object.getOwnPropertyNames(Object.getPrototypeOf(client.apis[api])));
        console.log('- Propriétés:', Object.keys(client.apis[api]));
      });
    }
    
    // Test pratique - récupérer des casts récents
    console.log('\n=== TEST PRATIQUE ===');
    
    // Essayons d'accéder aux méthodes probablement disponibles
    if (client.apis.cast) {
      const castApi = client.apis.cast;
      
      // Essayons plusieurs formats possibles pour appeler l'API
      try {
        console.log('Tentative de récupération des casts récents...');
        // Tenter avec une fonction standard
        const response = await castApi.fetchRecentCasts();
        console.log('Succès! Premiers casts:', response.data.casts.slice(0, 3));
      } catch (err1) {
        console.log('fetchRecentCasts a échoué, essai avec fetchFeed...');
        
        try {
          // Tenter avec une autre fonction possible
          const response = await castApi.fetchFeed({ limit: 5 });
          console.log('Succès avec fetchFeed! Premiers casts:', response.data.casts.slice(0, 3));
        } catch (err2) {
          console.log('fetchFeed a échoué, dernier essai avec getRecentCasts...');
          
          try {
            // Dernier essai
            const response = await castApi.getRecentCasts({ limit: 5 });
            console.log('Succès avec getRecentCasts! Premiers casts:', response.data.casts.slice(0, 3));
          } catch (err3) {
            console.log('Toutes les tentatives ont échoué. Détails:');
            
            // Accéder aux méthodes disponibles dans l'API
            const methodNames = Object.getOwnPropertyNames(Object.getPrototypeOf(castApi))
              .filter(name => typeof castApi[name] === 'function');
              
            console.log('Méthodes disponibles dans castApi:', methodNames);
            
            // Tenter d'appeler directement toutes les méthodes qui pourraient fonctionner
            for (const method of methodNames) {
              if (method !== 'constructor' && !method.startsWith('_')) {
                try {
                  console.log(`Essai de la méthode ${method}...`);
                  const result = await castApi[method]({ limit: 5 });
                  console.log(`La méthode ${method} a fonctionné!`);
                  console.log('Résultat:', result.data);
                  break;
                } catch (err) {
                  console.log(`La méthode ${method} a échoué:`, err.message);
                }
              }
            }
          }
        }
      }
    } else {
      console.log('API Cast non disponible.');
    }
    
  } catch (error) {
    console.error('Erreur globale:', error.message);
  }
}

exploreNeynarAPI();
