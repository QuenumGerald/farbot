import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const API_KEY = process.env.NEYNAR_API_KEY;

if (!API_KEY) {
  console.error('❌ ERREUR: NEYNAR_API_KEY est manquante dans le fichier .env');
  process.exit(1);
}

async function checkKey() {
  try {
    console.log('🔍 Vérification de base de la clé API...');
    
    // Endpoint pour vérifier les informations de l'utilisateur courant
    const response = await axios.get('https://api.neynar.com/v2/farcaster/user/bulk', {
      params: {
        fids: '3', // FID de @dwr (co-fondateur de Farcaster)
        viewer_fid: 3
      },
      headers: { 'api_key': API_KEY }
    });
    
    console.log('✅ Clé API valide !');
    console.log('📊 Utilisation actuelle:', response.data);
    
  } catch (error) {
    console.error('❌ Erreur lors de la vérification de la clé API:');
    
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Réponse:', error.response.data);
      
      if (error.response.status === 402) {
        console.log('\nℹ️ Votre compte semble être sur un plan gratuit.');
        console.log('Pour utiliser les fonctionnalités avancées, veuillez mettre à jour votre abonnement sur:');
        console.log('https://neynar.com/#pricing');
      }
    } else {
      console.error('Erreur:', error.message);
    }
    
    process.exit(1);
  }
}

checkKey();
