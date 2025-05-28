import dotenv from 'dotenv';
dotenv.config();
import axios from 'axios';

// Configuration à partir des variables d'environnement
const API_KEY = process.env.NEYNAR_API_KEY;
const SIGNER_UUID = process.env.NEYNAR_SIGNER_UUID;
const BOT_FID = process.env.BOT_FID;

// Récupérer le FID cible depuis les arguments de ligne de commande
const targetFid = process.argv[2] || '976189'; // Par défaut celui que vous avez essayé

async function testFollow() {
  console.log(`=== TEST DE FOLLOW AVEC AXIOS UNIQUEMENT ===`);
  console.log(`Signer UUID: ${SIGNER_UUID}`);
  console.log(`Bot FID: ${BOT_FID}`);
  console.log(`Target FID: ${targetFid}`);
  console.log(`API Key: ${API_KEY ? API_KEY.substring(0, 8) + '...' : 'non définie'}`);
  console.log('-'.repeat(50));

  try {
    // 1. D'abord, exécuter le follow
    console.log(`Étape 1: Suivre l'utilisateur FID ${targetFid}...`);
    const followResponse = await axios.post(
      'https://api.neynar.com/v2/farcaster/user/follow',
      {
        signer_uuid: SIGNER_UUID,
        target_fids: [parseInt(targetFid, 10)]
      },
      {
        headers: {
          'x-api-key': API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log(`✅ Follow réussi! Réponse:`, JSON.stringify(followResponse.data, null, 2));
    
    // 2. Attendre un peu pour que l'API Neynar puisse mettre à jour sa base de données
    console.log(`\nAttente de 2 secondes pour la propagation...`);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 3. Essayer d'obtenir la liste des utilisateurs suivis (following)
    console.log(`\nÉtape 2: Vérifier la liste des utilisateurs suivis par le bot...`);
    
    try {
      // Tentative avec l'endpoint /following qui pourrait ne pas exister
      const followingResponse = await axios.get(
        `https://api.neynar.com/v2/farcaster/user/${BOT_FID}/following`,
        {
          headers: {
            'x-api-key': API_KEY,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log(`Liste des utilisateurs suivis obtenue:`, JSON.stringify(followingResponse.data, null, 2));
      
      // Vérifier si le targetFid est dans la liste
      const follows = followingResponse.data.users || [];
      const isFollowing = follows.some(user => user.fid === parseInt(targetFid, 10));
      
      if (isFollowing) {
        console.log(`✅ CONFIRMATION: Le bot suit bien l'utilisateur avec FID ${targetFid}`);
      } else {
        console.log(`❌ Le bot NE SUIT PAS l'utilisateur avec FID ${targetFid} selon l'API`);
      }
      
    } catch (followingError) {
      console.error(`Erreur lors de la vérification des following:`, followingError.message);
      console.log(`\nL'endpoint /following semble ne pas exister, essayons un autre endpoint...`);
      
      // 4. Essayer un autre endpoint /user-search pour obtenir des infos sur l'utilisateur cible
      try {
        const userResponse = await axios.get(
          `https://api.neynar.com/v2/farcaster/user?fid=${targetFid}&viewer_fid=${BOT_FID}`,
          {
            headers: {
              'x-api-key': API_KEY,
              'Content-Type': 'application/json'
            }
          }
        );
        
        console.log(`Information sur l'utilisateur cible:`, JSON.stringify(userResponse.data, null, 2));
      } catch (userError) {
        console.error(`Erreur lors de la recherche d'informations sur l'utilisateur:`, userError.message);
      }
    }
    
    // 5. Essayons de publier un message simple pour vérifier que l'API fonctionne bien
    console.log(`\nÉtape 3: Test de publication d'un message simple...`);
    try {
      const castResponse = await axios.post(
        'https://api.neynar.com/v2/farcaster/cast',
        {
          signer_uuid: SIGNER_UUID,
          text: `Test d'API Neynar - ${new Date().toISOString()}`,
        },
        {
          headers: {
            'x-api-key': API_KEY,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log(`✅ Publication réussie! Réponse:`, JSON.stringify(castResponse.data, null, 2));
    } catch (castError) {
      console.error(`Erreur lors de la publication:`, castError.message);
      if (castError.response && castError.response.data) {
        console.error(`Détails de l'erreur:`, JSON.stringify(castError.response.data, null, 2));
      }
    }
    
    return followResponse.data;
  } catch (error) {
    console.error(`❌ Erreur:`, error.message);
    if (error.response && error.response.data) {
      console.error(`Détails de l'erreur:`, JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

// Exécuter le test
testFollow()
  .then(() => {
    console.log('\nTest terminé avec succès.');
  })
  .catch(err => {
    console.error('Test échoué avec erreur:', err.message);
    process.exit(1);
  });
