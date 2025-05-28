import dotenv from 'dotenv';
dotenv.config();
import { NeynarAPIClient, Configuration } from '@neynar/nodejs-sdk';
import axios from 'axios';

// Configuration à partir des variables d'environnement
const API_KEY = process.env.NEYNAR_API_KEY;
const SIGNER_UUID = process.env.NEYNAR_SIGNER_UUID;
const BOT_FID = process.env.BOT_FID;

// Récupérer le FID cible depuis les arguments de ligne de commande
const targetFid = process.argv[2] || '976189'; // Par défaut celui que vous avez essayé

// Initialiser le client officiel Neynar avec la nouvelle syntaxe pour v2
const config = new Configuration({
  apiKey: API_KEY,
  baseOptions: {
    headers: {
      "x-neynar-experimental": true,
    },
  },
});

const neynarClient = new NeynarAPIClient(config);

async function followUserDirect() {
  console.log(`=== TEST DE FOLLOW DIRECT AVEC L'API NEYNAR ===`);
  console.log(`Signer UUID: ${SIGNER_UUID}`);
  console.log(`Bot FID: ${BOT_FID}`);
  console.log(`Target FID: ${targetFid}`);
  console.log(`API Key: ${API_KEY ? API_KEY.substring(0, 8) + '...' : 'non définie'}`);
  console.log('-'.repeat(50));

  try {
    // 1. Exécuter le follow en utilisant axios directement
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
    
    // 2. Vérifier la relation en utilisant le SDK officiel
    console.log(`\nVérification du follow en utilisant le SDK Neynar...`);
    
    try {
      // Utiliser fetchUser pour obtenir des informations sur l'utilisateur
      const userResponse = await neynarClient.fetchUser(targetFid);
      console.log(`Informations sur l'utilisateur cible obtenues:`, 
        JSON.stringify({
          fid: userResponse.user.fid,
          username: userResponse.user.username,
          displayName: userResponse.user.displayName
        }, null, 2)
      );
      
      // Utiliser lookupUserByFid pour vérifier si le bot le suit
      console.log(`\nRecherche des informations de relation...`);
      const viewerContext = await neynarClient.lookupUserByFid({
        fid: targetFid, 
        viewerFid: BOT_FID
      });
      
      console.log(`Résultat de la vérification:`, 
        JSON.stringify({
          following: viewerContext.user?.viewerContext?.following || false,
          followedBy: viewerContext.user?.viewerContext?.followedBy || false
        }, null, 2)
      );
      
      if (viewerContext.user?.viewerContext?.following) {
        console.log(`✅ CONFIRMATION: Le bot suit bien l'utilisateur avec FID ${targetFid}`);
      } else {
        console.log(`❌ Le bot NE SUIT PAS l'utilisateur avec FID ${targetFid} selon l'API`);
      }
      
    } catch (verifyError) {
      console.error(`Erreur lors de la vérification:`, verifyError.message);
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
followUserDirect()
  .then(() => {
    console.log('\nTest terminé avec succès.');
  })
  .catch(err => {
    console.error('Test échoué avec erreur:', err.message);
    process.exit(1);
  });
