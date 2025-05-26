// Script très simple pour tester l'API Neynar
import dotenv from 'dotenv';
import { createRequire } from 'module';

// Charger la configuration
dotenv.config();
const require = createRequire(import.meta.url);

// Importer le SDK Neynar
const neynarSDK = require('@neynar/nodejs-sdk');
console.log('Structure du SDK Neynar:', Object.keys(neynarSDK));

// Tenter d'instancier le client selon différentes méthodes
async function main() {
  try {
    console.log('Test d\'initialisation du client Neynar...');
    
    if (!process.env.NEYNAR_API_KEY) {
      throw new Error('NEYNAR_API_KEY est requise dans .env');
    }
    
    // Tester différentes méthodes d'initialisation
    let client;
    
    // Méthode 1: NeynarV1APIClient
    if (neynarSDK.NeynarV1APIClient) {
      console.log('Tentative avec NeynarV1APIClient...');
      client = new neynarSDK.NeynarV1APIClient(process.env.NEYNAR_API_KEY);
      console.log('Méthodes disponibles:', Object.keys(client));
      
      // Essayer d'accéder aux API
      if (client.castApi) {
        console.log('Accès via client.castApi');
      } else if (client.getCastApi) {
        console.log('Accès via client.getCastApi()');
      } else {
        console.log('Structure client:', client);
      }
    }
    
    console.log('\nTest terminé. Utilisez les résultats pour adapter votre script.');
    
  } catch (error) {
    console.error('Erreur lors du test:', error);
  }
}

main();
