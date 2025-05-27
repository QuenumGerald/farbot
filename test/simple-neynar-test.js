// Test minimaliste pour vérifier la connexion Neynar
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Afficher un message de base pour vérifier que la sortie console fonctionne
console.log('🔍 Test minimaliste Neynar - Démarrage');

try {
  // Charger le .env manuellement
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const envPath = path.resolve(__dirname, '../.env');
  const envConfig = dotenv.parse(fs.readFileSync(envPath));
  
  console.log('📋 Variables d\'environnement:');
  console.log('- NEYNAR_API_KEY:', envConfig.NEYNAR_API_KEY ? '✅ Présente' : '❌ Manquante');
  console.log('- NEYNAR_SIGNER_UUID:', envConfig.NEYNAR_SIGNER_UUID ? '✅ Présent' : '❌ Manquant');
  
  // Tester la création du client Neynar directement
  console.log('\n🔌 Test de connexion Neynar');
  
  // Importer les dépendances Neynar
  import { NeynarAPIClient } from "@neynar/nodejs-sdk";
  
  // Créer un client minimal
  const neynarClient = new NeynarAPIClient({
    apiKey: envConfig.NEYNAR_API_KEY
  });
  
  // Test simple: obtenir un utilisateur par FID (1 = Dan Romero, fondateur de Farcaster)
  console.log('📡 Requête de test vers l\'API Neynar...');
  neynarClient.fetchBulkUsers({fids: [1]})
    .then(result => {
      console.log('✅ Connexion à l\'API réussie!');
      console.log(`👤 Utilisateur récupéré: ${result.users[0].username}`);
    })
    .catch(error => {
      console.error('❌ Erreur de connexion à l\'API:', error.message);
    });

} catch (error) {
  console.error('❌ Erreur générale:', error);
}
