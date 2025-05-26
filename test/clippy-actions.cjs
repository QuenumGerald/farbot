// Script fonctionnel de test pour les actions de Clippy Bot - Compatible avec Neynar SDK v0.3.2
require('dotenv').config();
const { NeynarV1APIClient } = require('@neynar/nodejs-sdk');

class ClippyActions {
  constructor() {
    if (!process.env.NEYNAR_API_KEY || !process.env.NEYNAR_SIGNER_UUID) {
      throw new Error('Variables NEYNAR_API_KEY et NEYNAR_SIGNER_UUID requises dans .env');
    }
    
    this.client = new NeynarV1APIClient(process.env.NEYNAR_API_KEY);
    this.signerUuid = process.env.NEYNAR_SIGNER_UUID;
    this.fid = process.env.NEYNAR_FID;
    
    console.log('Client Neynar initialisé avec succès');
  }
  
  // Récupérer les casts d'un utilisateur spécifique
  async getCastsByUser(fid) {
    try {
      console.log(`Récupération des casts de l'utilisateur ${fid}...`);
      
      // Utilisation de la méthode confirmée par l'explorateur
      const response = await this.client.apis.cast.casts({ fid });
      
      if (response.data && response.data.casts) {
        const casts = response.data.casts;
        console.log(`${casts.length} casts trouvés`);
        return casts;
      } else {
        console.log('Format de réponse inattendu:', response);
        return [];
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des casts:', error.message);
      return [];
    }
  }
  
  // Récupérer les informations sur un utilisateur
  async getUserInfo(usernameOrFid) {
    try {
      let response;
      const userApi = this.client.apis.user;
      
      if (isNaN(usernameOrFid)) {
        // Si c'est un nom d'utilisateur
        console.log(`Récupération des infos de l'utilisateur @${usernameOrFid}...`);
        response = await userApi.userByUsername({ username: usernameOrFid });
      } else {
        // Si c'est un FID
        console.log(`Récupération des infos de l'utilisateur avec FID ${usernameOrFid}...`);
        response = await userApi.user({ fid: usernameOrFid });
      }
      
      if (response.data && response.data.user) {
        const user = response.data.user;
        console.log(`Informations récupérées pour ${user.username} (FID: ${user.fid})`);
        return user;
      } else {
        console.log('Format de réponse inattendu:', response);
        return null;
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des infos utilisateur:', error.message);
      return null;
    }
  }
  
  // Obtenir des casts récents via des utilisateurs populaires
  async getRecentCasts() {
    try {
      console.log('Récupération d\'utilisateurs récents...');
      
      // D'abord récupérer des utilisateurs récents
      const response = await this.client.apis.user.recentUsers();
      
      if (!response.data || !response.data.users || !response.data.users.length) {
        console.log('Aucun utilisateur récent trouvé');
        return [];
      }
      
      // Prendre le premier utilisateur actif et récupérer ses casts
      const activeUser = response.data.users.find(u => u.activeStatus === 'active');
      if (!activeUser) {
        console.log('Aucun utilisateur actif trouvé');
        return [];
      }
      
      console.log(`Récupération des casts de ${activeUser.username} (${activeUser.fid})...`);
      return await this.getCastsByUser(activeUser.fid);
    } catch (error) {
      console.error('Erreur lors de la récupération des casts récents:', error.message);
      return [];
    }
  }
  
  // Afficher les casts de façon formatée
  displayCasts(casts) {
    if (!casts || casts.length === 0) {
      console.log('Aucun cast à afficher');
      return;
    }
    
    console.log('\n===== CASTS TROUVÉS =====');
    casts.forEach((cast, idx) => {
      console.log(`\n[${idx + 1}] Auteur: ${cast.author.username || cast.author.fid}`);
      console.log(`Texte: ${cast.text.substring(0, 100)}${cast.text.length > 100 ? '...' : ''}`);
      console.log(`Hash: ${cast.hash}`);
      console.log(`FID Auteur: ${cast.author.fid}`);
      console.log('---------------------------');
    });
    
    if (casts.length > 0) {
      console.log('\nActions possibles:');
      console.log(`- Voir le cast: node test/clippy-actions.cjs cast ${casts[0].hash}`);
      console.log(`- Voir profil: node test/clippy-actions.cjs user ${casts[0].author.username}`);
    }
  }
  
  // Récupérer les détails d'un cast spécifique
  async getCastDetails(hash) {
    try {
      console.log(`Récupération des détails du cast ${hash}...`);
      
      const response = await this.client.apis.cast.cast({ hash });
      
      if (response.data && response.data.cast) {
        const cast = response.data.cast;
        
        console.log('\n===== DÉTAILS DU CAST =====');
        console.log(`Auteur: ${cast.author.username} (FID: ${cast.author.fid})`);
        console.log(`Texte: ${cast.text}`);
        console.log(`Hash: ${cast.hash}`);
        console.log(`Timestamp: ${new Date(cast.timestamp).toLocaleString()}`);
        console.log(`Likes: ${cast.reactions.count}`);
        console.log(`Recasts: ${cast.recasts.count}`);
        console.log('---------------------------');
        
        return cast;
      } else {
        console.log('Format de réponse inattendu:', response);
        return null;
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des détails du cast:', error.message);
      return null;
    }
  }
  
  // Afficher les détails d'un utilisateur
  displayUserInfo(user) {
    if (!user) {
      console.log('Aucune information utilisateur à afficher');
      return;
    }
    
    console.log('\n===== PROFIL UTILISATEUR =====');
    console.log(`Nom d'utilisateur: @${user.username}`);
    console.log(`FID: ${user.fid}`);
    console.log(`Display Name: ${user.displayName || 'Non défini'}`);
    console.log(`Bio: ${user.profile?.bio?.text || 'Non définie'}`);
    console.log(`Followers: ${user.followerCount || 0}`);
    console.log(`Following: ${user.followingCount || 0}`);
    console.log(`URL pfp: ${user.pfp?.url || 'Non définie'}`);
    console.log('---------------------------');
    
    console.log('\nActions possibles:');
    console.log(`- Voir ses casts: node test/clippy-actions.cjs casts ${user.fid}`);
  }
}

// Point d'entrée principal
async function main() {
  try {
    const clippy = new ClippyActions();
    const command = process.argv[2] || 'help';
    const param = process.argv[3] || '';
    
    switch (command) {
      case 'recent':
        const casts = await clippy.getRecentCasts();
        clippy.displayCasts(casts);
        break;
        
      case 'casts':
        if (!param) {
          console.error('Veuillez spécifier un FID d\'utilisateur');
          console.log('Usage: node test/clippy-actions.cjs casts FID_UTILISATEUR');
          break;
        }
        const userCasts = await clippy.getCastsByUser(param);
        clippy.displayCasts(userCasts);
        break;
        
      case 'cast':
        if (!param) {
          console.error('Veuillez spécifier un hash de cast');
          console.log('Usage: node test/clippy-actions.cjs cast HASH_DU_CAST');
          break;
        }
        await clippy.getCastDetails(param);
        break;
        
      case 'user':
        if (!param) {
          console.error('Veuillez spécifier un nom d\'utilisateur ou FID');
          console.log('Usage: node test/clippy-actions.cjs user USERNAME_OU_FID');
          break;
        }
        const user = await clippy.getUserInfo(param);
        clippy.displayUserInfo(user);
        break;
        
      case 'help':
      default:
        console.log('Usage: node test/clippy-actions.cjs [commande] [paramètre]');
        console.log('\nCommandes disponibles:');
        console.log('  recent           - Récupérer des casts récents');
        console.log('  casts [fid]      - Récupérer les casts d\'un utilisateur spécifique');
        console.log('  cast [hash]      - Afficher les détails d\'un cast spécifique');
        console.log('  user [username]  - Afficher les informations d\'un utilisateur');
        break;
    }
  } catch (error) {
    console.error('Erreur:', error.message);
  }
}

main();
