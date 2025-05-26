import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;
const BASE_URL = 'https://api.neynar.com';
const SIGNER_UUID = process.env.NEYNAR_SIGNER_UUID;

async function searchCasts(keyword, limit = 5) {
  const url = `${BASE_URL}/v2/farcaster/cast/search?q=${encodeURIComponent(keyword)}&limit=${limit}`;
  const response = await fetch(url, {
    headers: { 'accept': 'application/json', 'api_key': NEYNAR_API_KEY }
  });
  if (!response.ok) throw new Error(`Erreur API search: ${response.statusText}`);
  const data = await response.json();
  return data.result?.casts || [];
}

async function likeCast(castHash) {
  const url = `${BASE_URL}/v2/farcaster/cast/like`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api_key': NEYNAR_API_KEY,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      signer_uuid: SIGNER_UUID,
      cast_hash: castHash
    })
  });
  if (!response.ok) throw new Error(`Erreur API like: ${response.statusText}`);
  const data = await response.json();
  return data;
}

async function main() {
  const keyword = process.argv[2] || 'ethereum';
  const casts = await searchCasts(keyword, 5);
  if (!casts.length) {
    console.log('Aucun cast trouvé.');
    return;
  }
  console.log('Casts trouvés :');
  casts.forEach((cast, i) => {
    console.log(`[${i + 1}] ${cast.author.username} : ${cast.text}\nHash: ${cast.hash}\n`);
  });

  // Like le premier cast trouvé
  const firstHash = casts[0].hash;
  console.log(`Like du cast : ${firstHash}`);
  const likeResult = await likeCast(firstHash);
  console.log('Résultat du like :', likeResult);
}

main().catch(e => console.error(e));
