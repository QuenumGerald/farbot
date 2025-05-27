require('dotenv').config();
const { NeynarV1APIClient } = require("@neynar/nodejs-sdk");

const client = new NeynarV1APIClient(process.env.NEYNAR_API_KEY);

// Exemple : récupérer le profil d'un utilisateur
async function fetchUser() {
  try {
    const fid = 3; // Dan Romero
    const user = await client.lookupUserByFID(fid);
    console.log("User:", user);
  } catch (err) {
    console.error("Erreur Neynar SDK:", err.message || err);
  }
}

fetchUser();

// Exemple : récupérer le profil d'un utilisateur
async function fetchUser() {
  try {
    const fid = 3; // Dan Romero
    const user = await client.lookupUserByFID(fid);
    console.log("User:", user);
  } catch (err) {
    console.error("Erreur Neynar SDK:", err.message || err);
  }
}

fetchUser();
