import dotenv from 'dotenv';
dotenv.config();
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { initializeBot } from '../src/bot/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Fonctions à tester
const TASKS = {
  'follow': testFollow,
  'search': testSearch,
  'all': testAll
};

// FIDs à suivre pour le test
const TEST_FIDS = [3, 4, 5]; // Delphi, Vitalik, etc.

// Mots-clés à rechercher pour le test
const TEST_KEYWORDS = [
  'bitcoin', 'ethereum', 'blockchain',
  'web3', 'cryptocurrency', 'crypto',
  'nft', 'defi', 'mining'
];

async function testFollow(bot) {
  console.log(`\n=== TEST DE FOLLOW ===`);
  try {
    console.log(`Suivi de ${TEST_FIDS.length} utilisateurs...`);
    const followedCount = await bot.followRelevantUsers(TEST_FIDS.length, TEST_FIDS);
    console.log(`✅ ${followedCount} utilisateur(s) suivi(s) avec succès!`);
  } catch (error) {
    console.error(`❌ Erreur lors du test de follow:`, error.message);
  }
}

async function testSearch(bot) {
  console.log(`\n=== TEST DE RECHERCHE ET RÉPONSE ===`);
  try {
    console.log(`Recherche de casts contenant les mots-clés: ${TEST_KEYWORDS.join(', ')}`);
    const count = await bot.searchAndRespondToKeywords(TEST_KEYWORDS, 3);
    console.log(`✅ ${count} cast(s) traité(s) avec succès!`);
  } catch (error) {
    console.error(`❌ Erreur lors du test de recherche:`, error.message);
  }
}

async function testAll(bot) {
  await testFollow(bot);
  await testSearch(bot);
}

async function main() {
  console.log(`🤖 DÉMARRAGE DES TESTS DU BOT CLIPPY...`);
  
  // Récupérer la tâche à exécuter depuis les arguments
  const taskName = process.argv[2] || 'all';
  const taskFn = TASKS[taskName];
  
  if (!taskFn) {
    console.error(`❌ Tâche inconnue: ${taskName}`);
    console.log(`Tâches disponibles: ${Object.keys(TASKS).join(', ')}`);
    process.exit(1);
  }
  
  try {
    // Initialiser le bot
    console.log(`Initialisation du bot...`);
    const bot = await initializeBot();
    console.log(`✅ Bot initialisé avec succès!`);
    
    // Exécuter la tâche spécifiée
    await taskFn(bot);
    
    console.log(`\n✅ Tests terminés avec succès!`);
  } catch (error) {
    console.error(`❌ Erreur lors des tests:`, error);
    process.exit(1);
  }
}

main().catch(console.error);
