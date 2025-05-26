import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

// Afficher les variables d'environnement chargées
console.log('Variables d\'environnement chargées :');
console.log('GOOGLE_API_KEY:', process.env.GOOGLE_API_KEY ? '*** (définie)' : 'non définie');
console.log('NEYNAR_API_KEY:', process.env.NEYNAR_API_KEY ? '*** (définie)' : 'non définie');
console.log('NEYNAR_SIGNER_UUID:', process.env.NEYNAR_SIGNER_UUID ? '*** (défini)' : 'non défini');
console.log('BOT_HANDLE:', process.env.BOT_HANDLE || 'non défini');
console.log('BOT_DISPLAY_NAME:', process.env.BOT_DISPLAY_NAME || 'non défini');
console.log('BIO:', process.env.BIO || 'non défini');
console.log('DATABASE_URL:', process.env.DATABASE_URL || 'non défini');
