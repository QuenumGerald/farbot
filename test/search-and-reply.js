import ClippyBot from '../src/bot/clippy.js';
import neynarService from '../src/services/neynar.js';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

const searchTerms = [
  'bitcoin', 'ethereum', 'blockchain', 'tech', 'clippy',
  'satoshi nakamoto', 'hal finney', 'lightning network',
  'segwit', 'bitcoin halving', 'UTXO', 'proof of work',
  'bitcoin mining difficulty', 'bitcoin mempool', 'taproot upgrade',
  'gavin wood', 'polkadot founder',
  'ethereum merge', 'solidity', 'ERC-20', 'EIP-1559', 'optimistic rollups',
  'layer 2 scaling', 'serenity upgrade', 'casper protocol',
  'zero knowledge proofs', 'merkle tree', 'consensus algorithm',
  'delegated proof of stake', 'sharding implementation',
  'blockchain interoperability', 'atomic swap', 'chainlink oracle',
  'decentralized identity', 'evm compatibility',
  'arm64 architecture', 'RISC processor', 'quantum computing',
  'neural network optimization', 'IPv6 transition', 'WebAssembly',
  'microservice architecture', 'TensorFlow implementation',
  'CUDA parallel computing', 'serverless deployment',
  'leanne ruzsa-atkinson',
  'kevan atkinson clippy', 'BonziBuddy purple gorilla', 'microsoft bob interface',
  'windows 95 release', 'windows NT kernel', 'internet explorer 6 quirks', 'MS-DOS commands'
];

const keywords = process.argv.slice(2).length ? process.argv.slice(2) : searchTerms;

async function main() {
  const bot = new ClippyBot();
  try {
    const casts = await neynarService.searchCasts(keywords, 10);
    if (!casts || !casts.length) {
      console.log('Aucun cast trouvé pour ces mots-clés.');
      return;
    }
    // Sélectionner un cast au hasard parmi les résultats
    const cast = casts[Math.floor(Math.random() * casts.length)];
    console.log(`Réponse au cast aléatoire de @${cast.author?.username || cast.author?.fid}`);
    console.log(`Texte: ${cast.text}`);
    console.log(`Hash: ${cast.hash}`);

    // Générer une réponse via ClippyBot
    await bot.searchAndRespondToKeywords([cast.text], 1);
    console.log('Réponse envoyée !');
  } catch (error) {
    console.error('Erreur lors de la recherche ou de la réponse :', error);
  }
}

main();
