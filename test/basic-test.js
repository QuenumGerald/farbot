// Test ultra-simple sans imports dynamiques
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { NeynarAPIClient } from "@neynar/nodejs-sdk";

// Afficher un message pour vérifier que la sortie console fonctionne
console.log('🔍 Test basique - Démarrage');

// Charger le .env manuellement
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envConfig = dotenv.parse(envContent);

console.log('📋 Variables d\'environnement:');
console.log('- NEYNAR_API_KEY:', envConfig.NEYNAR_API_KEY ? '✅ Présente' : '❌ Manquante');
console.log('- NEYNAR_SIGNER_UUID:', envConfig.NEYNAR_SIGNER_UUID ? '✅ Présent' : '❌ Manquant');

// Créer un client Neynar
const neynarClient = new NeynarAPIClient({
  apiKey: envConfig.NEYNAR_API_KEY
});

// Test simple: obtenir un utilisateur par FID
async function testNeynar() {
  try {
    console.log('📡 Requête vers l\'API Neynar...');
    const result = await neynarClient.fetchBulkUsers({fids: [1]});
    console.log('✅ Connexion réussie!');
    console.log(`👤 Utilisateur récupéré: ${result.users[0].username}`);
  } catch (error) {
    console.error('❌ Erreur de connexion:', error.message);
  }
}

// Exécuter le test
testNeynar();
