import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { getConfig } from '../src/config/index.js';

// Logs directs pour le débogage
console.log('Démarrage du script de test Neynar...');

// Importer le service Neynar avec gestion des erreurs
let neynarService;
try {
  neynarService = (await import('../src/services/neynar.js')).default;
  console.log('Service Neynar importé avec succès');
} catch (error) {
  console.error('Erreur lors de l\'importation du service Neynar:', error);
  process.exit(1);
}

// Charger manuellement les variables d'environnement
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../.env');
console.log(`Chemin du fichier .env: ${envPath}`);

// Variables globales pour être accessibles dans les fonctions
let config;
// neynarService est déjà importé plus haut

// Charger les dépendances
async function initialize() {
  try {
    const envFileContent = fs.readFileSync(envPath, 'utf8');
    console.log(`Fichier .env lu, taille: ${envFileContent.length} octets`);
    const envConfig = dotenv.parse(envFileContent);
    
    // Afficher les variables d'environnement (masquer les clés API)
    console.log('Variables d\'environnement chargées:');
    Object.keys(envConfig).forEach(key => {
      const value = key.includes('API_KEY') || key.includes('UUID') 
        ? `${envConfig[key].substring(0, 5)}...` 
        : envConfig[key];
      console.log(`  ${key}: ${value}`);
    });
    
    // Créer la configuration
    console.log('\nCréation de la configuration...');
    config = getConfig(envConfig);
    
    // Vérifier que le service Neynar est disponible
    console.log('Vérification du service Neynar...');
    if (!neynarService) {
      throw new Error('Service Neynar non disponible');
    }
    console.log('Service Neynar vérifié avec succès');
    
    return true;
  } catch (error) {
    console.error(`Erreur lors du chargement de la configuration: ${error.message}`);
    console.error(error.stack);
    return false;
  }
}

console.log('\n🔍 TEST D\'INTÉGRATION NEYNAR');
console.log('============================\n');

async function testRecentCasts() {
  console.log('📱 Récupération des casts récents...');
  try {
    const casts = await neynarService.getRecentCasts(5);
    console.log(`✅ ${casts.length} casts récupérés.`);
    
    if (casts.length > 0) {
      const cast = casts[0];
      console.log('\n📝 Premier cast récupéré:');
      console.log(`  Hash: ${cast.hash}`);
      console.log(`  Auteur: ${cast.author.username}`);
      console.log(`  Texte: ${cast.text.substring(0, 50)}${cast.text.length > 50 ? '...' : ''}`);
      return cast.hash; // Retourner le hash pour d'autres tests
    }
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
  return null;
}

async function testSearchCasts(keyword) {
  console.log(`\n🔍 Recherche de casts avec le mot-clé "${keyword}"...`);
  try {
    const casts = await neynarService.searchCasts(keyword, 5);
    console.log(`✅ ${casts.length} casts trouvés.`);
    
    if (casts.length > 0) {
      const cast = casts[0];
      console.log('\n📝 Premier cast trouvé:');
      console.log(`  Hash: ${cast.hash}`);
      console.log(`  Auteur: ${cast.author.username}`);
      console.log(`  Texte: ${cast.text.substring(0, 50)}${cast.text.length > 50 ? '...' : ''}`);
      return cast.hash;
    }
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
  return null;
}

async function testLikeCast(castHash) {
  if (!castHash) {
    console.log('\n⏩ Test de like ignoré: aucun cast disponible.');
    return;
  }
  
  console.log(`\n👍 Test de like du cast ${castHash}...`);
  try {
    // Vérifier d'abord si le cast est déjà liké
    const isLiked = await neynarService.isCastLiked(castHash);
    console.log(`  État actuel: ${isLiked ? 'déjà liké' : 'pas encore liké'}`);
    
    // Tenter de liker (ou unliker si déjà liké)
    const result = isLiked 
      ? await neynarService.unlikeCast(castHash)
      : await neynarService.likeCast(castHash);
    
    console.log(`✅ Action ${isLiked ? 'unlike' : 'like'} effectuée.`);
    console.log(`  Résultat: ${JSON.stringify(result, null, 2)}`);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    if (error.response) {
      console.error('  Détails de la réponse:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

async function main() {
  try {
    // Vérifier que l'initialisation a réussi
    if (!neynarService) {
      console.error('Service Neynar non initialisé');
      return;
    }

    // Test 1: Récupérer des casts récents
    const recentCastHash = await testRecentCasts();
    
    // Test 2: Rechercher des casts par mot-clé
    const searchTerms = ['web3', 'crypto', 'ai'];
    const keyword = searchTerms[Math.floor(Math.random() * searchTerms.length)];
    const searchCastHash = await testSearchCasts(keyword);
    
    // Test 3: Liker un cast
    // Utiliser le hash d'un cast trouvé, ou null si aucun n'est disponible
    const castHashToLike = recentCastHash || searchCastHash;
    await testLikeCast(castHashToLike);
    
    console.log('\n✅ Tests terminés.');
  } catch (error) {
    console.error('\n❌ Erreur globale:', error);
    console.error(error.stack);
  }
}

// Exécuter le script principal
(async () => {
  console.log('Initialisation du test...');
  if (await initialize()) {
    console.log('Initialisation réussie, démarrage des tests');
    await main();
  } else {
    console.error('Initialisation échouée, arrêt des tests');
    process.exit(1);
  }
})();
