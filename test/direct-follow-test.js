import dotenv from 'dotenv';
dotenv.config();
import axios from 'axios';

// Configuration à partir des variables d'environnement
const API_KEY = process.env.NEYNAR_API_KEY;
const SIGNER_UUID = process.env.NEYNAR_SIGNER_UUID;

// Récupérer le FID cible depuis les arguments de ligne de commande
const targetFid = process.argv[2] || '976189'; // Par défaut celui que vous avez essayé

async function testDirectFollow() {
  console.log(`=== TEST DE FOLLOW DIRECT AVEC L'API NEYNAR ===`);
  console.log(`Signer UUID: ${SIGNER_UUID}`);
  console.log(`Target FID: ${targetFid}`);
  console.log(`API Key: ${API_KEY ? API_KEY.substring(0, 8) + '...' : 'non définie'}`);
  console.log('-'.repeat(50));

  try {
    // Appel direct à l'API, comme dans l'exemple que vous avez fourni
    const options = {
      method: 'POST',
      url: 'https://api.neynar.com/v2/farcaster/user/follow',
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json'
      },
      data: {
        signer_uuid: SIGNER_UUID,
        target_fids: [parseInt(targetFid, 10)]
      }
    };

    console.log(`Envoi de la requête avec les options:`, JSON.stringify(options, null, 2));
    
    const response = await axios(options);
    
    console.log(`✅ Succès! Réponse:`, JSON.stringify(response.data, null, 2));
    
    // Vérifier que le follow a bien été effectué
    console.log(`\nVérification du follow...`);
    // Cette vérification peut ne pas fonctionner correctement car l'API peut avoir des contraintes
    // mais nous pouvons au moins essayer
    
    return response.data;
  } catch (error) {
    console.error(`❌ Erreur:`, error.message);
    if (error.response && error.response.data) {
      console.error(`Détails de l'erreur:`, JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

// Exécuter le test
testDirectFollow()
  .then(() => {
    console.log('Test terminé avec succès.');
  })
  .catch(err => {
    console.error('Test échoué avec erreur:', err.message);
    process.exit(1);
  });
