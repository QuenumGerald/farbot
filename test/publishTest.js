import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const API_KEY = process.env.NEYNAR_API_KEY;
const SIGNER_UUID = process.env.NEYNAR_SIGNER_UUID;

if (!API_KEY || !SIGNER_UUID) {
  console.error('❌ ERREUR: Veuillez vérifier vos variables d\'environnement NEYNAR_API_KEY et NEYNAR_SIGNER_UUID');
  process.exit(1);
}

async function publishTestMessage() {
  try {
    console.log('📝 Préparation de la publication...');
    
    const message = '🤖 Bonjour Farcaster ! Ceci est un test de publication depuis Clippy Bot.';
    
    console.log('📤 Envoi du message...');
    const response = await axios.post(
      'https://api.neynar.com/v2/farcaster/cast',
      {
        signer_uuid: SIGNER_UUID,
        text: message
      },
      {
        headers: {
          'api_key': API_KEY,
          'Content-Type': 'application/json',
          'accept': 'application/json'
        }
      }
    );
    
    const cast = response.data.cast;
    console.log('✅ Message publié avec succès !');
    console.log('🔗 Lien vers le cast:', `https://warpcast.com/${cast.author.username}/${cast.hash}`);
    
  } catch (error) {
    console.error('❌ Erreur lors de la publication:');
    
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Réponse:', error.response.data);
    } else {
      console.error('Erreur:', error.message);
    }
    
    if (error.response?.data?.message?.includes('signer')) {
      console.log('\nℹ️ Problème avec le signer. Assurez-vous que:');
      console.log('1. Votre signer est correctement configuré dans Neynar');
      console.log('2. Le SIGNER_UUID dans votre .env est correct');
      console.log('3. Votre compte a les permissions nécessaires');
    }
    
    process.exit(1);
  }
}

publishTestMessage();
