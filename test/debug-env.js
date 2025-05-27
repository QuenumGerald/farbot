import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { getConfig } from '../src/config/index.js';

// Chemins
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../.env');

console.log('=== TEST DE DÉBOGAGE ENV ===');
console.log(`Chemin du .env: ${envPath}`);
console.log(`Le fichier .env existe: ${fs.existsSync(envPath)}`);

// Lecture manuelle du .env
try {
  const envContent = fs.readFileSync(envPath, 'utf8');
  console.log('\nContenu du .env (10 premiers caractères):');
  console.log(envContent.substring(0, 10) + '...');
  
  // Parsing des variables
  const envConfig = dotenv.parse(envContent);
  console.log('\nVariables d\'environnement:');
  console.log('GOOGLE_API_KEY:', envConfig.GOOGLE_API_KEY ? '✅ Définie' : '❌ Non définie');
  console.log('NEYNAR_API_KEY:', envConfig.NEYNAR_API_KEY ? '✅ Définie' : '❌ Non définie');
  console.log('NEYNAR_SIGNER_UUID:', envConfig.NEYNAR_SIGNER_UUID ? '✅ Définie' : '❌ Non définie');
  console.log('BOT_HANDLE:', envConfig.BOT_HANDLE ? '✅ Définie' : '❌ Non définie');
  
  // Utilisation de getConfig
  try {
    const config = getConfig(envConfig);
    console.log('\nConfig créée avec succès:');
    console.log('- API Neynar:', config.neynar.apiKey ? '✅ Définie' : '❌ Non définie');
    console.log('- Signer UUID:', config.neynar.signerUuid ? '✅ Définie' : '❌ Non définie');
    console.log('- Bot Handle:', config.bot.handle);
  } catch (configError) {
    console.error('ERREUR lors de la création de la config:', configError.message);
  }
  
} catch (error) {
  console.error('ERREUR lors de la lecture du .env:', error);
}

// Vérification de process.env standard
console.log('\nprocess.env standard:');
console.log('NODE_ENV:', process.env.NODE_ENV || 'non défini');
console.log('HOME:', process.env.HOME || 'non défini');
