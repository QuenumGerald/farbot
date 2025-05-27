// Script minimaliste - Test direct de l'API Neynar sans passer par les classes du bot
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { NeynarAPIClient } from "@neynar/nodejs-sdk";

// Messages de démarrage très visibles
console.log('==========================================');
console.log('🔍 TEST DIRECT NEYNAR - ' + new Date().toISOString());
console.log('==========================================');

// Charger le .env
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../.env');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

// Créer un client Neynar directement avec la clé API
const apiKey = envConfig.NEYNAR_API_KEY;
console.log(`API Key: ${apiKey ? apiKey.substring(0, 5) + '...' : 'non définie'}`);

const client = new NeynarAPIClient({
  apiKey: apiKey
});

// Fonction de recherche minimale
async function searchCasts(keyword) {
  console.log(`Recherche avec le mot-clé: "${keyword}"`);
  
  try {
    // Appel direct à l'API de recherche
    const result = await client.searchCasts({ q: keyword, limit: 5 });
    console.log(`Résultat: ${result.casts ? result.casts.length : 0} casts trouvés`);
    
    if (result.casts && result.casts.length > 0) {
      const cast = result.casts[0];
      console.log('\nPremier cast:');
      console.log(`- Hash: ${cast.hash}`);
      console.log(`- Auteur: ${cast.author?.username || 'Inconnu'}`);
      console.log(`- Texte: ${cast.text?.substring(0, 50) + '...' || 'Sans texte'}`);
      
      return result.casts;
    } else {
      console.log('Aucun cast trouvé.');
      return [];
    }
  } catch (error) {
    console.error('❌ Erreur de recherche:', error);
    return [];
  }
}

// Fonction de like minimale
async function likeCast(hash) {
  console.log(`Tentative de like du cast: ${hash}`);
  
  try {
    const result = await client.publishReaction({
      reaction_type: 'like',
      signer_uuid: envConfig.NEYNAR_SIGNER_UUID,
      target_cast_hash: hash
    });
    
    console.log('✅ Like réussi!');
    console.log(result);
    return true;
  } catch (error) {
    console.error('❌ Erreur de like:', error);
    return false;
  }
}

// Exécution
async function main() {
  try {
    console.log('\n===== RECHERCHE =====');
    const keyword = process.argv[2] || 'crypto';
    const casts = await searchCasts(keyword);
    
    if (casts.length > 0) {
      console.log('\n===== LIKE =====');
      await likeCast(casts[0].hash);
    }
  } catch (error) {
    console.error('❌ Erreur globale:', error);
  } finally {
    console.log('\n===== FIN DU TEST =====');
  }
}

// Exécuter le test
main();
