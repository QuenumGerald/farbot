import { initializeBot } from './bot/index.js';

import { KEYWORDS } from './jobs/scheduler.js';

async function runTestMode() {
  const bot = await initializeBot();

  console.log('--- MODE TEST ---');

  // [DÉSACTIVÉ] Publication de messages temporairement commentée pour les tests
  /*
  for (let i = 0; i < 3; i++) {
    try {
      console.log(`[TEST] Publication #${i + 1}`);
      await bot.publishDailyContent({ theme: 'test', withImage: false, contentType: 'text' });
    } catch (e) {
      console.error(`[TEST] Erreur publication #${i + 1}:`, e.message);
    }
    await new Promise(r => setTimeout(r, 2000));
  }
  */

  // Répondre à 3 casts trouvés par mots-clés
  try {
    // Importer la vraie liste de mots-clés depuis scheduler.js
    console.log(`[TEST] Réponse à 3 casts par mots-clés`);
    const repliedCasts = await bot.searchAndRespondToKeywords(KEYWORDS, 3);
    console.log(`[TEST] Nombre de réponses envoyées: ${repliedCasts.length}`);
  } catch (e) {
    console.error(`[TEST] Erreur lors des réponses par mots-clés:`, e.message);
  }
  await new Promise(r => setTimeout(r, 2000));

  // Follow 3 utilisateurs pertinents trouvés via les mots-clés
  try {
    console.log(`[TEST] Follow de 3 utilisateurs pertinents`);
    const nbFollowed = await bot.followRelevantUsers(3);
    console.log(`[TEST] Nombre de follows: ${nbFollowed}`);
  } catch (e) {
    console.error(`[TEST] Erreur lors du follow par mots-clés:`, e.message);
  }

  console.log('--- FIN MODE TEST ---');
  process.exit(0);
}

runTestMode();
