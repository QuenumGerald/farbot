import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

// Convertir exec en promesse
const execAsync = promisify(exec);

// Charger manuellement les variables d'environnement
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../.env');
console.log(`Chemin du fichier .env: ${envPath}`);

try {
  // Charger le contenu du fichier .env
  const envFileContent = fs.readFileSync(envPath, 'utf8');
  console.log(`Fichier .env lu, taille: ${envFileContent.length} octets`);
  const envConfig = dotenv.parse(envFileContent);
  
  // Extraire les valeurs nécessaires
  const { NEYNAR_API_KEY, NEYNAR_SIGNER_UUID } = envConfig;
  
  if (!NEYNAR_API_KEY || !NEYNAR_SIGNER_UUID) {
    throw new Error('API Key ou Signer UUID manquant dans le fichier .env');
  }
  
  console.log('Clés API chargées avec succès');
  
  // Fonction pour publier un cast avec curl
  async function publishCastWithCurl(text) {
    console.log(`\n🚀 PUBLICATION DIRECTE AVEC CURL`);
    console.log('==============================\n');
    
    // Créer le message avec horodatage
    const timestamp = new Date().toISOString();
    const message = text || `Test de Clippy Bot à ${timestamp} - via curl direct`;
    
    console.log(`📝 Message à publier: "${message}"`);
    
    // Construire la commande curl exactement comme dans l'exemple fonctionnel
    const curlCommand = `curl --request POST \\
      --url https://api.neynar.com/v2/farcaster/cast \\
      --header 'Content-Type: application/json' \\
      --header 'x-api-key: ${NEYNAR_API_KEY}' \\
      --data '{
        "signer_uuid": "${NEYNAR_SIGNER_UUID}",
        "text": "${message}"
      }'`;
    
    console.log('Exécution de la commande curl...');
    
    try {
      // Exécuter la commande curl
      const { stdout, stderr } = await execAsync(curlCommand);
      
      if (stderr) {
        console.error('⚠️ Avertissements:', stderr);
      }
      
      if (stdout) {
        console.log('\n✅ Réponse de l\'API:');
        // Tenter de formater la sortie JSON
        try {
          const response = JSON.parse(stdout);
          console.log(JSON.stringify(response, null, 2));
          
          if (response.success && response.cast) {
            console.log('\n🎉 Message publié avec succès!');
            console.log(`Hash: ${response.cast.hash}`);
            console.log(`Auteur: ${response.cast.author?.username || 'N/A'}`);
          }
        } catch (jsonError) {
          // Si ce n'est pas du JSON, afficher tel quel
          console.log(stdout);
        }
      }
    } catch (error) {
      console.error('❌ Erreur lors de l\'exécution de curl:', error.message);
    }
  }
  
  // Exécuter la fonction principale
  const message = process.argv[2] || null; // Prendre un message en argument ou utiliser le défaut
  publishCastWithCurl(message);
  
} catch (error) {
  console.error(`Erreur lors du chargement de la configuration:`, error.message);
  console.error(error.stack);
}
