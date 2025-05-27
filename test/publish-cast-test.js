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
    
    console.log('\n🚀 TEST DE PUBLICATION DE MESSAGES');
    console.log('================================\n');
    
    // Créer un message avec horodatage pour être unique
    const timestamp = new Date().toISOString();
    const message = `Test de Clippy Bot à ${timestamp} - Généré automatiquement`;
    
    // Publier un cast
    console.log(`📝 Tentative de publication du message: "${message}"`);
    try {
      const result = await neynarService.publishCast(message);
      console.log('\n✅ Message publié avec succès!');
      console.log('Détails:');
      console.log(`- Hash: ${result.cast?.hash || 'N/A'}`);
      console.log(`- Auteur: ${result.cast?.author?.username || 'N/A'}`);
      console.log(`- Texte: ${result.cast?.text || 'N/A'}`);
    } catch (error) {
      console.error('❌ Erreur lors de la publication:', error.message);
      if (error.response && error.response.data) {
        console.error('Détails:', JSON.stringify(error.response.data, null, 2));
      }
    }
    
    // Récupérer les casts récents pour vérifier
    console.log('\n🔍 Vérification des casts récents...');
    try {
      const recentCasts = await neynarService.getRecentCasts(5);
      console.log(`✅ ${recentCasts.length} casts récents récupérés`);
      
      // Afficher le premier cast (qui devrait être le nôtre)
      if (recentCasts.length > 0) {
        const mostRecent = recentCasts[0];
        console.log('\nCast le plus récent:');
        console.log(`- Hash: ${mostRecent.hash || 'N/A'}`);
        console.log(`- Auteur: ${mostRecent.author?.username || 'N/A'}`);
        console.log(`- Texte: ${mostRecent.text || 'N/A'}`);
      }
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des casts récents:', error.message);
    }
    
    console.log('\n✅ Test terminé');
  }).catch(error => {
    console.error('Erreur lors du chargement du service Neynar:', error);
  });
} catch (error) {
  console.error(`Erreur lors du chargement de la configuration:`, error.message);
  console.error(error.stack);
}
