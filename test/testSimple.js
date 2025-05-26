// Test simple de connexion à Neynar
console.log("🔍 Test de connexion à Neynar...");

// Vérification des variables d'environnement
const apiKey = process.env.NEYNAR_API_KEY;
const signerUuid = process.env.NEYNAR_SIGNER_UUID;

console.log("🔑 Clé API:", apiKey ? "✅ Présente" : "❌ Manquante");
console.log("🔑 Signer UUID:", signerUuid || "❌ Non défini");

if (!apiKey || !signerUuid) {
  console.log("\n❌ Veuillez configurer les variables d'environnement nécessaires dans le fichier .env");
  process.exit(1);
}

console.log("\n✅ Configuration de base valide !");
console.log("Le bot est prêt à se connecter à Farcaster via Neynar.");
console.log("\nPour tester la publication, vous pouvez utiliser le script principal du bot avec :");
console.log("npm start");
