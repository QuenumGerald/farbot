import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;
const BASE_URL = 'https://api.neynar.com';

async function getUserCasts(fid, limit = 10) {
  const url = `${BASE_URL}/v2/farcaster/feed/user/casts?fid=${fid}&limit=${limit}`;
  const response = await fetch(url, {
    headers: { 'accept': 'application/json', 'x-api-key': NEYNAR_API_KEY }
  });
  if (!response.ok) throw new Error(`Erreur API: ${response.statusText}`);
  const data = await response.json();
  return data.result?.casts || [];
}

async function main() {
  const fid = process.argv[2] || '226'; // FID par défaut (Vitalik)
  const casts = await getUserCasts(fid, 5);
  if (!casts.length) {
    console.log('Aucun cast trouvé.');
    return;
  }
  casts.forEach((cast, i) => {
    console.log(`[${i + 1}] ${cast.author.username} : ${cast.text}\nHash: ${cast.hash}\n`);
  });
}

main().catch(e => console.error(e));
