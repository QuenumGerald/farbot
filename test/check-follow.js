import dotenv from 'dotenv';
dotenv.config();
import axios from 'axios';

// Configuration
const apiKey = process.env.NEYNAR_API_KEY;
const signerUuid = process.env.NEYNAR_SIGNER_UUID;

// FID à vérifier
const targetFid = process.argv[2] || '976189'; // Par défaut, le FID que vous avez testé

async function checkFollowStatus() {
  try {
    console.log(`Vérification des follows pour le signer ${signerUuid}...`);
    
    // 1. Obtenir les informations sur le signer
    const signerResponse = await axios.get(
      `https://api.neynar.com/v2/farcaster/signer?signer_uuid=${signerUuid}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'api-key': apiKey
        }
      }
    );
    
    if (!signerResponse.data || !signerResponse.data.result || !signerResponse.data.result.signer) {
      console.error('Erreur: Impossible d\'obtenir les informations du signer');
      return;
    }
    
    const signer = signerResponse.data.result.signer;
    console.log(`Signer trouvé: FID ${signer.fid}, Statut: ${signer.status}`);
    
    // 2. Obtenir les follows du FID associé au signer
    const userFid = signer.fid;
    console.log(`\nRécupération des follows pour FID ${userFid}...`);
    
    const followsResponse = await axios.get(
      `https://api.neynar.com/v1/farcaster/following?fid=${userFid}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'api-key': apiKey
        }
      }
    );
    
    if (!followsResponse.data || !followsResponse.data.result || !followsResponse.data.result.users) {
      console.error('Erreur: Impossible d\'obtenir la liste des follows');
      return;
    }
    
    const follows = followsResponse.data.result.users;
    console.log(`Nombre total de follows: ${follows.length}`);
    
    // 3. Vérifier si le FID cible est suivi
    const isFollowing = follows.some(user => user.fid.toString() === targetFid.toString());
    
    console.log(`\nStatut du follow pour FID ${targetFid}: ${isFollowing ? '✅ SUIVI' : '❌ NON SUIVI'}`);
    
    // 4. Si le FID est suivi, afficher ses détails
    if (isFollowing) {
      const targetUser = follows.find(user => user.fid.toString() === targetFid.toString());
      console.log(`Détails de l'utilisateur suivi:`);
      console.log(`  Username: @${targetUser.username}`);
      console.log(`  Nom: ${targetUser.displayName}`);
    }
    
    // 5. Vérifier directement les actions de follow récentes
    console.log(`\nRecherche d'actions de follow récentes...`);
    const recentFollowsResponse = await axios.get(
      `https://api.neynar.com/v1/farcaster/casts?fid=${userFid}&type=follows&limit=10`,
      {
        headers: {
          'Content-Type': 'application/json',
          'api-key': apiKey
        }
      }
    );
    
    if (recentFollowsResponse.data && 
        recentFollowsResponse.data.result && 
        recentFollowsResponse.data.result.casts) {
      
      const followCasts = recentFollowsResponse.data.result.casts;
      console.log(`Actions de follow récentes trouvées: ${followCasts.length}`);
      
      followCasts.forEach((cast, index) => {
        console.log(`\n[${index + 1}] Action follow/unfollow:`);
        console.log(`  Hash: ${cast.hash}`);
        console.log(`  Timestamp: ${new Date(cast.timestamp).toISOString()}`);
        console.log(`  FID cible: ${cast.mentions && cast.mentions[0] ? cast.mentions[0].fid : 'N/A'}`);
      });
    } else {
      console.log(`Aucune action de follow récente trouvée.`);
    }
    
  } catch (error) {
    console.error('Erreur lors de la vérification du follow:', error.message);
    if (error.response) {
      console.error('Détails:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Exécuter la vérification
checkFollowStatus();
