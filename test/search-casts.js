import neynarService from '../src/services/neynar.js';
import dotenv from 'dotenv';
dotenv.config();

// Utilisation : node test/search-casts.js motcle1 motcle2 ...
const searchTerms = [
  // Termes généraux de base
  'bitcoin', 'ethereum', 'blockchain', 'tech', 'clippy',
  // Termes Bitcoin spécifiques et techniques
  'satoshi nakamoto', 'hal finney', 'lightning network',
  'segwit', 'bitcoin halving', 'UTXO', 'proof of work',
  'bitcoin mining difficulty', 'bitcoin mempool', 'taproot upgrade',
  // Termes Ethereum spécifiques et techniques
  'gavin wood', 'polkadot founder',
  'ethereum merge', 'solidity', 'ERC-20', 'EIP-1559', 'optimistic rollups',
  'layer 2 scaling', 'serenity upgrade', 'casper protocol',
  // Termes blockchain spécifiques et techniques
  'zero knowledge proofs', 'merkle tree', 'consensus algorithm',
  'delegated proof of stake', 'sharding implementation',
  'blockchain interoperability', 'atomic swap', 'chainlink oracle',
  'decentralized identity', 'evm compatibility',
  // Termes tech spécifiques et profonds
  'arm64 architecture', 'RISC processor', 'quantum computing',
  'neural network optimization', 'IPv6 transition', 'WebAssembly',
  'microservice architecture', 'TensorFlow implementation',
  'CUDA parallel computing', 'serverless deployment',
  // Termes Clippy et technologie rétro spécifiques
  'leanne ruzsa-atkinson',
  'kevan atkinson clippy', 'BonziBuddy purple gorilla', 'microsoft bob interface',
  'windows 95 release', 'windows NT kernel', 'internet explorer 6 quirks', 'MS-DOS commands'
];

const keywords = process.argv.slice(2).length ? process.argv.slice(2) : searchTerms;

async function main() {
  if (!keywords.length) {
    console.error('Veuillez fournir au moins un mot-clé pour la recherche.');
    process.exit(1);
  }

  try {
    const casts = await neynarService.searchCasts(keywords, 10);
    if (!casts || !casts.length) {
      console.log('Aucun cast trouvé pour ces mots-clés.');
      return;
    }
    console.log('Casts trouvés :');
    casts.forEach((cast, idx) => {
      console.log(`\n[${idx + 1}] Auteur: ${cast.author?.username || cast.author?.fid}`);
      console.log(`Texte: ${cast.text}`);
      console.log(`Hash: ${cast.hash}`);
    });
  } catch (error) {
    console.error('Erreur lors de la recherche de casts :', error);
  }
}

main();
