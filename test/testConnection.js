import dotenv from 'dotenv';
dotenv.config();
import pkg from '@neynar/nodejs-sdk';
const NeynarAPIClient = pkg.NeynarAPIClient;

// Configuration directe (à remplacer par vos valeurs si nécessaire)
const config = {
  neynar: {
    apiKey: process.env.NEYNAR_API_KEY,
    signerUuid: process.env.NEYNAR_SIGNER_UUID,
    apiUrl: 'https://api.neynar.com'
  },
  bot: {
    handle: process.env.BOT_HANDLE || '@clippy'
  }
};

async function testConnection() {
  try {
    console.log('🔍 Test de connexion à Farcaster via Neynar...');
    
    // Initialisation du client Neynar
    const client = new NeynarAPIClient(
      config.neynar.apiKey,
      config.neynar.apiUrl,
      { axiosInstance: { timeout: 10000 } } // Timeout de 10 secondes
    );
    
    console.log('🔑 Clé API Neynar:', config.neynar.apiKey ? '✅ Présente' : '❌ Manquante');
    console.log('🔑 Signer UUID:', config.neynar.signerUuid || '❌ Non défini');

    // Test de récupération des informations du bot
    console.log('🔎 Récupération des informations du bot...');
    const username = config.bot.handle.replace('@', '');
    console.log('🔍 Recherche du compte:', username);
    
    // Essayer de récupérer les infos du bot
    try {
      const botInfo = await client.lookupUserByUsername(username);
      console.log('✅ Informations du bot récupérées avec succès:');
      console.log(`👤 Nom d'utilisateur: @${botInfo.user.username}`);
      console.log(`🆔 FID: ${botInfo.user.fid}`);
      console.log(`📝 Bio: ${botInfo.user.profile.bio?.text || 'Aucune bio'}`);
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des informations du bot:');
      console.error(error.message);
      throw error;
    }

    // Test de publication d'un cast (commenté pour l'instant)
    /*
    console.log('📝 Tentative de publication d\'un message de test...');
    try {
      const cast = await client.publishCast(
        config.neynar.signerUuid,
        '🤖 Salut Farcaster ! Ceci est un test de connexion depuis Clippy Bot.'
      );
      
      console.log('✅ Message publié avec succès !');
      console.log('🔗 Lien vers le cast:', `https://warpcast.com/~/compose?text=Test%20de%20publication%20depuis%20Clippy`);
    } catch (error) {
      console.error('❌ Erreur lors de la publication du message:');
      console.error(error.message);
      throw error;
    }
    */
    
    console.log('\n✅ Test de connexion réussi !');
    console.log('Le bot est correctement configuré pour se connecter à Farcaster via Neynar.');
    
  } catch (error) {
    console.error('❌ Erreur lors du test de connexion:');
    console.error(error.message);
    
    if (error.response) {
      console.error('Détails de l\'erreur:', {
        status: error.response.status,
        data: error.response.data
      });
    }
    
    process.exit(1);
  }
}

testConnection();
