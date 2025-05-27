import { getConfig } from '../src/config/index.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Charger le .env manuellement
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../.env');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

// Configurer avec les variables d'environnement chargées
const config = getConfig(envConfig);
console.log('Configuration chargée:', {
  apiKeyDefined: !!config.neynar.apiKey,
  signerUuidDefined: !!config.neynar.signerUuid,
});

// Importer le service Neynar après avoir configuré l'environnement
import neynarService from '../src/services/neynar.js';

// Tester directement searchCasts
async function testSearch() {
  console.log('\n===== TEST DE RECHERCHE NEYNAR =====');
  try {
    console.log('Recherche de casts avec le mot-clé "farcaster"...');
    const casts = await neynarService.searchCasts('farcaster', 5);
    console.log('Résultat:', casts.length > 0 ? `✅ ${casts.length} casts trouvés` : '❌ Aucun cast');
    
    if (casts.length > 0) {
      console.log('\nPremier cast trouvé:');
      const cast = casts[0];
      console.log(`- Hash: ${cast.hash}`);
      console.log(`- Auteur: ${cast.author?.username || 'Inconnu'}`);
      console.log(`- Texte: ${cast.text?.substring(0, 50)}...`);
      console.log(`- Likes: ${cast.reactions?.count || 0}`);
    }
  } catch (error) {
    console.error('❌ Erreur lors de la recherche:', error);
  }
}

// Tester le like d'un cast (optionnel)
async function testLike() {
  console.log('\n===== TEST DE LIKE NEYNAR =====');
  try {
    // Chercher d'abord un cast à liker
    const casts = await neynarService.searchCasts('farcaster', 1);
    if (casts.length === 0) {
      console.log('❌ Aucun cast trouvé pour tester le like');
      return;
    }
    
    const castToLike = casts[0];
    console.log(`Tentative de like du cast: ${castToLike.hash}`);
    
    // Essayer de liker le cast
    const result = await neynarService.likeCast(castToLike.hash);
    console.log('Résultat du like:', result ? '✅ Succès' : '❌ Échec');
  } catch (error) {
    console.error('❌ Erreur lors du like:', error);
  }
}

// Exécuter les tests
async function runTests() {
  await testSearch();
  // Décommente la ligne suivante pour tester également le like
  // await testLike(); 
}

runTests();
