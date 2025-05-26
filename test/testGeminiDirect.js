import dotenv from 'dotenv';
dotenv.config();

import { GoogleGenerativeAI } from '@google/generative-ai';

// Configuration directe pour le test
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

if (!GOOGLE_API_KEY) {
  console.error('Erreur: GOOGLE_API_KEY n\'est pas définie dans les variables d\'environnement');
  process.exit(1);
}

// Initialiser directement le client Gemini
const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);
const MODEL_NAME = 'gemini-2.0-flash-lite';

async function testGemini() {
  try {
    console.log('Test de génération avec Gemini...');
    
    // Créer un modèle
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    
    // Générer du contenu
    const prompt = "Génère un message amusant et court (moins de 280 caractères) sur un sujet aléatoire.";
    console.log('\nPrompt:', prompt);
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log('\n=== Réponse de Gemini ===');
    console.log(text);
    console.log('\nLongueur:', text.length, 'caractères');
    
  } catch (error) {
    console.error('Erreur lors de la génération avec Gemini:', error);
  }
}

// Lancer le test
testGemini();
