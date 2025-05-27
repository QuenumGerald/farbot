// Test des casts récents au lieu de la recherche
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { NeynarAPIClient } from "@neynar/nodejs-sdk";

console.log('==========================================');
console.log('🔄 TEST CASTS RÉCENTS - ' + new Date().toISOString());
console.log('==========================================');

// Charger le .env
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../.env');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

// Créer un client Neynar directement
const apiKey = envConfig.NEYNAR_API_KEY;
console.log(`API Key: ${apiKey ? apiKey.substring(0, 5) + '...' : 'non définie'}`);
console.log(`Signer UUID: ${envConfig.NEYNAR_SIGNER_UUID ? envConfig.NEYNAR_SIGNER_UUID.substring(0, 5) + '...' : 'non défini'}`);

const client = new NeynarAPIClient({
  apiKey: apiKey
});

// Récupérer les casts récents au lieu de faire une recherche
async function fetchRecentCasts() {
  console.log('\n📋 Récupération des casts récents...');
  
  try {
    // Option 1: casts du feed global (selon l'erreur reçue)
    // Les paramètres utilisent snakeCase dans la requête mais camelCase dans le SDK
    const result = await client.fetchFeed({
      feedType: 'filter',
      filterType: 'global_trending' // Valeur correcte selon l'erreur
    });
    
    console.log(`Résultat: ${result.casts.length} casts récents trouvés`);
    
    if (result.casts.length > 0) {
      console.log('\nAperçu des 3 premiers casts:');
      for (let i = 0; i < Math.min(3, result.casts.length); i++) {
        const cast = result.casts[i];
        console.log(`\n--- Cast ${i+1} ---`);
        console.log(`Hash: ${cast.hash}`);
        console.log(`Auteur: @${cast.author.username}`);
        console.log(`Texte: ${cast.text ? cast.text.substring(0, 50) + (cast.text.length > 50 ? '...' : '') : '[sans texte]'}`);
      }
      return result.casts;
    } else {
      console.log('Aucun cast récent trouvé.');
      return [];
    }
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des casts:', error);
    return [];
  }
}

// Fonction de like
async function likeCast(hash) {
  console.log(`\n👍 Tentative de like du cast: ${hash}`);
  
  try {
    // Selon l'erreur reçue, le paramètre s'appelle 'target' et non 'target_cast_hash'
    const result = await client.publishReaction({
      reaction_type: 'like',
      signer_uuid: envConfig.NEYNAR_SIGNER_UUID,
      target: hash // Paramètre corrigé
    });
    
    console.log('✅ Like réussi!');
    return true;
  } catch (error) {
    console.error('❌ Erreur de like:', error);
    console.error('Message:', error.message);
    return false;
  }
}

// Exécution
async function main() {
  try {
    // Récupérer des casts récents
    const casts = await fetchRecentCasts();
    
    // Liker le premier cast si disponible
    if (casts.length > 0) {
      const castToLike = casts[0];
      await likeCast(castToLike.hash);
    }
  } catch (error) {
    console.error('❌ Erreur globale:', error);
  } finally {
    console.log('\n✨ Test terminé!');
  }
}

// Exécuter le test
main();
