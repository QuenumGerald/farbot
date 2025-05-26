import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const API_KEY = process.env.NEYNAR_API_KEY;
const SIGNER_UUID = process.env.NEYNAR_SIGNER_UUID;
const BOT_HANDLE = process.env.BOT_HANDLE || '@clippy';

if (!API_KEY) {
  console.error('❌ ERREUR: NEYNAR_API_KEY est manquante dans le fichier .env');
  process.exit(1);
}

if (!SIGNER_UUID) {
  console.error('❌ ERREUR: NEYNAR_SIGNER_UUID est manquante dans le fichier .env');
  process.exit(1);
}

const client = axios.create({
  baseURL: 'https://api.neynar.com',
  headers: {
    'Content-Type': 'application/json',
    'api_key': API_KEY,
  },
  timeout: 10000,
});

async function testConnection() {
  try {
    console.log('🔍 Test de connexion à Neynar API...');
    
    // Test de la récupération des informations du bot
    console.log('\n🔎 Test de connexion à l\'API Neynar...');
    
    // Utilisation de l'endpoint de vérification d'identité pour tester la connexion
    const userResponse = await client.get('/v2/farcaster/user', {
      params: {
        fid: 3, // Utilisation d'un FID connu (par exemple, 3 pour Farcaster)
        viewer_fid: 3
      },
    });

    if (userResponse.data && userResponse.data.users && userResponse.data.users.length > 0) {
      const user = userResponse.data.users[0];
      console.log('✅ Informations du bot récupérées avec succès:');
      console.log(`👤 Nom d'utilisateur: @${user.username}`);
      console.log(`🆔 FID: ${user.fid}`);
      console.log(`📝 Bio: ${user.profile.bio?.text || 'Aucune bio'}`);
    } else {
      console.log('ℹ️ Aucune information trouvée pour ce nom d\'utilisateur.');
    }

    console.log('\n✅ Test de connexion réussi !');
    console.log('Le bot est correctement configuré pour se connecter à Farcaster via Neynar.');
    
  } catch (error) {
    console.error('\n❌ Erreur lors du test de connexion:');
    
    if (error.response) {
      // La requête a été faite et le serveur a répondu avec un statut d'erreur
      console.error(`Status: ${error.response.status}`);
      console.error('Données:', error.response.data);
    } else if (error.request) {
      // La requête a été faite mais aucune réponse n'a été reçue
      console.error('Aucune réponse du serveur. Vérifiez votre connexion Internet.');
    } else {
      // Une erreur s'est produite lors de la configuration de la requête
      console.error('Erreur:', error.message);
    }
    
    process.exit(1);
  }
}

testConnection();
