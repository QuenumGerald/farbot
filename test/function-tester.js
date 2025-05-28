import { initializeBot } from '../src/bot/index.js';
import neynarService from '../src/services/neynar.js';
import contentGenerator from '../src/services/contentGenerator.js';
import config from '../src/config/index.js';
import { KEYWORDS } from '../src/jobs/scheduler.js';

// Fonction pour exécuter les tests
async function runTests() {
  try {
    console.log('=== CLIPPY BOT FUNCTION TESTER ===');
    console.log('Configuration actuelle:');
    console.log(`  API Key Neynar: ${config.neynar.apiKey.substring(0, 8)}...`);
    console.log(`  Signer UUID: ${config.neynar.signerUuid}`);
    console.log(`  Bot FID: ${config.bot.fid}`);
    console.log('-'.repeat(40));

    // Initialiser le bot
    console.log('Initialisation du bot...');
    const bot = await initializeBot();
    console.log('✅ Bot initialisé avec succès!');

    // Menu des tests disponibles
    const argv = process.argv.slice(2);
    const testChoice = argv[0] || 'menu';
    const param = argv[1];

    if (testChoice === 'menu' || testChoice === 'help') {
      showMenu();
      process.exit(0);
    }

    // Exécuter le test sélectionné
    await runSelectedTest(testChoice, param, bot);

  } catch (error) {
    console.error('❌ ERREUR:', error);
    process.exit(1);
  }
}

function showMenu() {
  console.log(`
Utilisation: node test/function-tester.js [test] [paramètre]

Tests disponibles:
  publish         - Tester la publication d'un message
  reply [hash]    - Tester la réponse à un cast (hash en paramètre)
  keywords [n]    - Rechercher et répondre aux mots-clés (n = nombre)
  follow [fid]    - Suivre un utilisateur spécifique (FID en paramètre)
  follow-auto [n] - Suivre n utilisateurs automatiquement
  like [hash]     - Liker un cast spécifique (hash en paramètre)
  like-auto [n]   - Liker n casts automatiquement
  search [mot]    - Rechercher des casts avec un mot-clé
  check           - Vérifier la configuration et la connectivité
  
Exemples:
  node test/function-tester.js publish
  node test/function-tester.js follow 123456
  node test/function-tester.js keywords 3
  `);
}

async function runSelectedTest(test, param, bot) {
  console.log(`Exécution du test: ${test}${param ? ` avec paramètre: ${param}` : ''}`);
  
  switch (test) {
    case 'publish':
      await testPublish(bot);
      break;
    case 'reply':
      if (!param) {
        console.error('❌ Paramètre requis: hash du cast à répondre');
        process.exit(1);
      }
      await testReply(bot, param);
      break;
    case 'keywords':
      const limit = parseInt(param, 10) || 3;
      await testKeywords(bot, limit);
      break;
    case 'follow':
      if (!param) {
        console.error('❌ Paramètre requis: FID de l\'utilisateur à suivre');
        process.exit(1);
      }
      await testFollow(param);
      break;
    case 'follow-auto':
      const followCount = parseInt(param, 10) || 2;
      await testFollowAuto(bot, followCount);
      break;
    case 'like':
      if (!param) {
        console.error('❌ Paramètre requis: hash du cast à liker');
        process.exit(1);
      }
      await testLike(param);
      break;
    case 'like-auto':
      const likeCount = parseInt(param, 10) || 3;
      await testLikeAuto(bot, likeCount);
      break;
    case 'search':
      if (!param) {
        console.error('❌ Paramètre requis: mot-clé à rechercher');
        process.exit(1);
      }
      await testSearch(param);
      break;
    case 'check':
      await testConnection();
      break;
    default:
      console.error(`❌ Test inconnu: ${test}`);
      showMenu();
      process.exit(1);
  }
}

async function testPublish(bot) {
  console.log('📝 Test de publication...');
  try {
    const post = await contentGenerator.generatePost();
    console.log(`Post généré: "${post}"`);
    
    const result = await neynarService.publishCast(post);
    console.log('✅ Publication réussie!');
    console.log(`Hash du cast: ${result.hash}`);
    console.log(`URL: https://warpcast.com/~/conversations/${result.hash}`);
    return result;
  } catch (error) {
    console.error('❌ Erreur lors de la publication:', error.message);
    if (error.response && error.response.data) {
      console.error('Détails:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

async function testReply(bot, castHash) {
  console.log(`💬 Test de réponse au cast ${castHash}...`);
  try {
    const reply = await contentGenerator.generateReply("Test de réponse automatique");
    console.log(`Réponse générée: "${reply}"`);
    
    const result = await neynarService.replyToCast(reply, castHash);
    console.log('✅ Réponse publiée avec succès!');
    console.log(`Hash de la réponse: ${result.hash}`);
    console.log(`URL: https://warpcast.com/~/conversations/${result.hash}`);
    return result;
  } catch (error) {
    console.error('❌ Erreur lors de la réponse:', error.message);
    if (error.response && error.response.data) {
      console.error('Détails:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

async function testKeywords(bot, limit) {
  console.log(`🔍 Test de recherche et réponse à ${limit} casts par mots-clés...`);
  try {
    const results = await bot.searchAndRespondToKeywords(KEYWORDS, limit);
    console.log(`✅ Répondu à ${results.length} casts avec succès!`);
    results.forEach((cast, i) => {
      console.log(`${i+1}. Cast original: "${cast.text?.substring(0, 50)}..."`);
    });
    return results;
  } catch (error) {
    console.error('❌ Erreur lors de la recherche par mots-clés:', error.message);
    throw error;
  }
}

async function testFollow(fid) {
  console.log(`👤 Test de follow de l'utilisateur FID: ${fid}...`);
  try {
    // Vérifier si déjà suivi
    const isFollowing = await neynarService.checkIfFollowing(fid);
    console.log(`État actuel: ${isFollowing ? 'Déjà suivi' : 'Pas encore suivi'}`);
    
    if (isFollowing) {
      console.log('Utilisateur déjà suivi, on va le unfollow d\'abord pour tester...');
      await neynarService.unfollowUser(fid);
      console.log('✅ Unfollow réussi.');
    }
    
    // Tester le follow
    console.log('Tentative de follow...');
    const result = await neynarService.followUser(fid);
    console.log('✅ Follow réussi!');
    console.log('Résultat:', JSON.stringify(result, null, 2));
    
    // Vérifier que le follow a bien été pris en compte
    const newFollowStatus = await neynarService.checkIfFollowing(fid);
    console.log(`Vérification après follow: ${newFollowStatus ? 'Suivi confirmé' : 'NON SUIVI (ERREUR)'}`);
    
    return result;
  } catch (error) {
    console.error('❌ Erreur lors du follow:', error.message);
    if (error.response && error.response.data) {
      console.error('Détails:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

async function testFollowAuto(bot, count) {
  console.log(`👥 Test de follow automatique de ${count} utilisateurs...`);
  try {
    const followedCount = await bot.followRelevantUsers(count);
    console.log(`✅ Suivi ${followedCount} utilisateurs avec succès!`);
    return followedCount;
  } catch (error) {
    console.error('❌ Erreur lors du follow automatique:', error.message);
    throw error;
  }
}

async function testLike(castHash) {
  console.log(`👍 Test de like du cast ${castHash}...`);
  try {
    // Vérifier si déjà liké
    const isLiked = await neynarService.isCastLiked(castHash);
    console.log(`État actuel: ${isLiked ? 'Déjà liké' : 'Pas encore liké'}`);
    
    if (isLiked) {
      console.log('Cast déjà liké, on va l\'unliker d\'abord pour tester...');
      await neynarService.unlikeCast(castHash);
      console.log('✅ Unlike réussi.');
    }
    
    // Tester le like
    console.log('Tentative de like...');
    const result = await neynarService.likeCast(castHash);
    console.log('✅ Like réussi!');
    console.log('Résultat:', JSON.stringify(result, null, 2));
    
    return result;
  } catch (error) {
    console.error('❌ Erreur lors du like:', error.message);
    if (error.response && error.response.data) {
      console.error('Détails:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

async function testLikeAuto(bot, count) {
  console.log(`👍 Test de like automatique de ${count} casts...`);
  try {
    const likedCount = await bot.likeRecentCasts(count, KEYWORDS);
    console.log(`✅ Liké ${likedCount} casts avec succès!`);
    return likedCount;
  } catch (error) {
    console.error('❌ Erreur lors du like automatique:', error.message);
    throw error;
  }
}

async function testSearch(keyword) {
  console.log(`🔍 Recherche de casts avec le mot-clé "${keyword}"...`);
  try {
    const casts = await neynarService.searchCasts(keyword, 5);
    console.log(`✅ Trouvé ${casts.length} casts!`);
    
    casts.forEach((cast, i) => {
      console.log(`\n${i+1}. Cast par @${cast.author.username}:`);
      console.log(`   Hash: ${cast.hash}`);
      console.log(`   Texte: ${cast.text.substring(0, 100)}${cast.text.length > 100 ? '...' : ''}`);
      console.log(`   URL: https://warpcast.com/~/conversations/${cast.hash}`);
    });
    
    return casts;
  } catch (error) {
    console.error('❌ Erreur lors de la recherche:', error.message);
    throw error;
  }
}

async function testConnection() {
  console.log('🔌 Test de connectivité...');
  try {
    // Vérifier l'API Neynar
    console.log('Vérification de l\'API Neynar...');
    const testUser = await neynarService.getUserByFid(config.bot.fid);
    console.log(`✅ API Neynar OK! Bot identifié comme: @${testUser.username}`);
    console.log(`   FID: ${testUser.fid}`);
    console.log(`   Nom: ${testUser.display_name}`);
    console.log(`   Adresse: ${testUser.custody_address}`);
    
    // Vérifier la génération de contenu
    console.log('\nVérification du générateur de contenu...');
    const testPost = await contentGenerator.generatePost();
    console.log(`✅ Génération de contenu OK! Exemple: "${testPost}"`);
    
    return true;
  } catch (error) {
    console.error('❌ Erreur lors du test de connectivité:', error.message);
    throw error;
  }
}

// Exécuter les tests
runTests();
