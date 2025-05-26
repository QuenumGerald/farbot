import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const API_KEY = process.env.NEYNAR_API_KEY;

if (!API_KEY) {
  console.error('❌ ERREUR: NEYNAR_API_KEY est manquante dans le fichier .env');
  process.exit(1);
}

async function verifyKey() {
  try {
    console.log('🔍 Vérification de la clé API Neynar...');
    
    const response = await axios.get('https://api.neynar.com/v2/farcaster/verifications', {
      params: { fid: 3 }, // FID de @dwr (co-fondateur de Farcaster)
      headers: { 'api_key': API_KEY }
    });
    
    console.log('✅ Clé API valide !');
    console.log('📊 Données de vérification pour @dwr:', response.data);
    
  } catch (error) {
    console.error('❌ Erreur lors de la vérification de la clé API:');
    
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Réponse:', error.response.data);
    } else {
      console.error('Erreur:', error.message);
    }
    
    process.exit(1);
  }
}

verifyKey();
