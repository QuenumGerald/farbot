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
  
  // Importer le service Neynar après avoir chargé les variables d'environnement
  console.log('Importation du service Neynar...');
  
  // Créer la configuration
  console.log('Création de la configuration...');
  const config = getConfig(envConfig);
  
  // Import dynamique pour s'assurer que les variables sont chargées avant
  import('../src/services/neynar.js').then(async (module) => {
    const neynarService = module.default;
    console.log('Service Neynar importé avec succès');
    
    console.log('\n🚀 TEST DES FONCTIONNALITÉS SOCIALES');
    console.log('==================================\n');
    
    // Objet de cast récent à liker
    const castHash = '0xe81915906d170565cfef964a70dd1f1f6db915b6'; // Hash du cast de test que tu as créé
    
    // 1. Vérifier l'existence du cast via fetchFeed qui est disponible sur le client
    console.log(`📋 Vérification de l'existence du cast ${castHash}...`);
    try {
      // Récupérer le feed pour vérifier si le cast existe
      const feed = await neynarService.getRecentCasts(10);
      
      console.log(`✅ ${feed.length} casts récents récupérés pour vérification`);
      console.log('   Hash du premier cast:', feed[0]?.hash || 'N/A');
    } catch (error) {
      console.error(`❌ Erreur lors de la récupération des casts:`, error.message);
    }
    
    // 2. Liker le cast
    console.log(`\n👍 Tentative de like du cast ${castHash}...`);
    try {
      const likeResponse = await neynarService.likeCast(castHash);
      console.log(`✅ Résultat de l'opération:`, JSON.stringify(likeResponse, null, 2));
    } catch (error) {
      console.error(`❌ Erreur lors du like:`, error.message);
    }
    
    console.log('\n✅ Test terminé');
  }).catch(error => {
    console.error('Erreur lors du chargement du service Neynar:', error);
  });
} catch (error) {
  console.error(`Erreur lors du chargement de la configuration:`, error.message);
  console.error(error.stack);
}
