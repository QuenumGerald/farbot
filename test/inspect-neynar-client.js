import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { getConfig } from '../src/config/index.js';

// Charger manuellement les variables d'environnement
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../.env');
console.log(`Chemin du fichier .env: ${envPath}`);

try {
  // Charger le contenu du fichier .env
  const envFileContent = fs.readFileSync(envPath, 'utf8');
  console.log(`Fichier .env lu, taille: ${envFileContent.length} octets`);
  const envConfig = dotenv.parse(envFileContent);
  
  // Créer la configuration
  console.log('Création de la configuration...');
  const config = getConfig(envConfig);
  
  // Import dynamique pour s'assurer que les variables sont chargées avant
  import('../src/services/neynar.js').then(async (module) => {
    const neynarService = module.default;
    console.log('Service Neynar importé avec succès');
    
    // Récupérer le client Neynar
    const client = neynarService.getClient();
    
    // Examiner la structure du client
    console.log('\n📋 STRUCTURE DU CLIENT NEYNAR:');
    console.log('==============================\n');
    
    // Afficher les clés de premier niveau
    console.log('Méthodes/propriétés disponibles:');
    Object.keys(client).forEach(key => {
      console.log(`- ${key}: ${typeof client[key]}`);
    });
    
    // Vérifier si le client a des méthodes HTTP
    console.log('\nMéthodes HTTP:');
    ['get', 'post', 'put', 'delete', 'request'].forEach(method => {
      console.log(`- ${method}: ${typeof client[method]}`);
    });
    
    // Vérifier si le client a une propriété pour accéder à axios
    console.log('\nPropriétés liées à axios:');
    ['axios', 'httpClient', 'axiosInstance', 'http'].forEach(prop => {
      console.log(`- ${prop}: ${typeof client[prop]}`);
      
      // Si cette propriété existe et a ses propres méthodes HTTP
      if (client[prop] && typeof client[prop] === 'object') {
        ['get', 'post', 'put', 'delete'].forEach(method => {
          console.log(`  - ${prop}.${method}: ${typeof client[prop][method]}`);
        });
      }
    });
    
    // Vérifier les méthodes spécifiques à l'API Neynar
    console.log('\nMéthodes spécifiques à l\'API Neynar:');
    ['publishReaction', 'publishCast', 'fetchFeed'].forEach(method => {
      console.log(`- ${method}: ${typeof client[method]}`);
    });
    
  }).catch(error => {
    console.error('Erreur lors du chargement du service Neynar:', error);
  });
} catch (error) {
  console.error(`Erreur lors du chargement de la configuration:`, error.message);
  console.error(error.stack);
}
