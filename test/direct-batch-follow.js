import dotenv from 'dotenv';
dotenv.config();
import axios from 'axios';

// Configuration à partir des variables d'environnement
const API_KEY = process.env.NEYNAR_API_KEY;
const SIGNER_UUID = process.env.NEYNAR_SIGNER_UUID;
const BOT_FID = process.env.BOT_FID;

// FIDs à suivre (récupérés depuis les arguments ou valeurs par défaut)
const targetFids = process.argv.length > 2 
  ? process.argv.slice(2).map(fid => parseInt(fid, 10)) 
  : [3, 4, 5]; // FIDs par défaut comme dans votre exemple

async function testBatchFollow() {
  console.log(`=== TEST DE FOLLOW EN LOT AVEC AXIOS DIRECT ===`);
  console.log(`Signer UUID: ${SIGNER_UUID}`);
  console.log(`Bot FID: ${BOT_FID}`);
  console.log(`Target FIDs: ${targetFids.join(', ')}`);
  console.log(`API Key: ${API_KEY ? API_KEY.substring(0, 8) + '...' : 'non définie'}`);
  console.log('-'.repeat(50));

  try {
    // Exécuter le follow en lot
    console.log(`Suivi de ${targetFids.length} utilisateurs en une seule requête...`);
    
    const response = await axios.post(
      'https://api.neynar.com/v2/farcaster/user/follow',
      {
        signer_uuid: SIGNER_UUID,
        target_fids: targetFids
      },
      {
        headers: {
          'x-api-key': API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const result = response.data;
    
    console.log(`✅ Follow en lot réussi! Réponse:`);
    console.log(JSON.stringify(result, null, 2));
    
    // Vérifier les résultats individuels
    if (result.details && result.details.length > 0) {
      console.log(`\nRésultats individuels:`);
      
      result.details.forEach(detail => {
        const status = detail.success ? '✅' : '❌';
        console.log(`${status} FID ${detail.target_fid}: ${detail.success ? 'Suivi avec succès' : 'Échec'}`);
        if (detail.hash) {
          console.log(`   Hash de transaction: ${detail.hash}`);
        }
      });
    }
    
    return result;
  } catch (error) {
    console.error(`❌ Erreur:`, error.message);
    if (error.response && error.response.data) {
      console.error(`Détails de l'erreur:`, JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

// Exécuter le test
testBatchFollow()
  .then(() => {
    console.log('\nTest terminé avec succès.');
  })
  .catch(err => {
    console.error('Test échoué avec erreur:', err.message);
    process.exit(1);
  });
