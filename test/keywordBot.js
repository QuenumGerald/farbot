import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

// Configuration
const CONFIG = {
  neynar: {
    apiKey: process.env.NEYNAR_API_KEY,
    signerUuid: process.env.NEYNAR_SIGNER_UUID,
    apiUrl: 'https://api.neynar.com/v2/farcaster',
    // Endpoints économiques
    endpoints: {
      recentCasts: '/v1/farcaster/recent-casts', // 2 CU
      cast: '/v1/castById', // 1 CU
      userBulk: '/v2/farcaster/user/bulk', // 1 CU pour 100 users
      publishCast: '/v2/farcaster/cast' // 150 CU
    },
    // Paramètres de requête
    params: {
      limit: 25, // Nombre de messages à récupérer
      viewerFid: 3, // FID du bot
      viewerFidType: 'developer_managed'
    }
  },
  // Mots-clés à surveiller (en minuscules)
  keywords: ['clippy', 'aide', 'help', 'assistant', 'bot'],
  // Paramètres d'optimisation
  optimization: {
    checkInterval: 300000, // 5 minutes entre les vérifications
    maxCastsPerRun: 10, // Nombre max de casts à traiter par exécution
    cacheDuration: 3600000, // 1 heure de cache pour les utilisateurs
    batchSize: 50 // Taille des lots pour les requêtes groupées
  },
  botName: 'clippy'
};

// Stockage en mémoire
const cache = {
  processedMessages: new Set(), // Messages déjà traités
  userCache: new Map(), // Cache des utilisateurs
  lastFetch: 0 // Timestamp de la dernière requête
};

// Client HTTP optimisé
const client = axios.create({
  baseURL: CONFIG.neynar.apiUrl,
  headers: {
    'api_key': CONFIG.neynar.apiKey,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  timeout: 15000 // Timeout augmenté pour les connexions lentes
});

// Gestion des erreurs API
class APIError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

/**
 * Récupère les derniers messages
 */
async function fetchRecentCasts() {
  try {
    console.log('🔍 Récupération des derniers messages...');
    
    const response = await client.get(CONFIG.neynar.endpoints.recentCasts, {
      params: {
        limit: CONFIG.optimization.maxCastsPerRun,
        viewerFid: CONFIG.neynar.params.viewerFid
      }
    });

    return response.data.result?.casts || [];
  } catch (error) {
    throw new APIError(
      'Erreur lors de la récupération des messages',
      error.response?.status,
      error.response?.data
    );
  }
}

/**
 * Traite un lot de messages
 */
async function processBatch(casts) {
  for (const cast of casts) {
    try {
      // Vérifier si le message a déjà été traité
      if (cache.processedMessages.has(cast.hash)) continue;
      
      // Vérifier si le message contient un mot-clé
      const message = cast.text.toLowerCase();
      const hasKeyword = CONFIG.keywords.some(keyword => 
        message.includes(keyword.toLowerCase())
      );

      if (hasKeyword) {
        console.log(`\n💬 Message trouvé: "${cast.text}"`);
        console.log(`🔗 https://warpcast.com/${cast.author.username}/${cast.hash}`);
        
        // Répondre au message
        await replyToCast(cast);
        
        // Mettre en cache
        cache.processedMessages.add(cast.hash);
        console.log('✅ Réponse envoyée !');
      }
    } catch (error) {
      console.error('Erreur lors du traitement du message:', error);
    }
  }
}

/**
 * Recherche et répond aux messages pertinents
 */
async function searchAndReply() {
  try {
    const now = Date.now();
    
    // Vérifier le cache avant de faire une nouvelle requête
    if (now - cache.lastFetch < CONFIG.optimization.checkInterval / 2) {
      console.log('⏭️ Vérification trop récente, attente du prochain intervalle...');
      return;
    }

    console.log('🔍 Recherche de messages pertinents...');
    cache.lastFetch = now;
    
    // Récupérer les derniers messages
    const casts = await fetchRecentCasts();
    console.log(`📡 ${casts.length} messages récupérés`);

    // Traitement par lots
    const batchSize = CONFIG.optimization.batchSize;
    for (let i = 0; i < casts.length; i += batchSize) {
      const batch = casts.slice(i, i + batchSize);
      await processBatch(batch);
    }
  } catch (error) {
    console.error('❌ Erreur lors de la recherche de messages:');
    if (error instanceof APIError) {
      console.error(`Status: ${error.status}`);
      console.error('Détails:', error.data);
    } else {
      console.error('Erreur inattendue:', error);
    }
  }
}

/**
 * Répond à un cast
 */
async function replyToCast(cast) {
  try {
    // Vérifier si on a déjà répondu récemment à cet utilisateur
    const userCacheKey = `user_${cast.author.fid}`;
    const lastInteraction = cache.userCache.get(userCacheKey) || 0;
    const now = Date.now();
    
    // Limiter les réponses à un utilisateur à toutes les 24h
    if (now - lastInteraction < 86400000) {
      console.log(`⏭️ Réponse déjà envoyée à @${cast.author.username} récemment`);
      return;
    }

    // Générer une réponse personnalisée
    const replyText = generateReply(cast);
    
    // Envoyer la réponse
    const response = await client.post(CONFIG.neynar.endpoints.publishCast, {
      signer_uuid: CONFIG.neynar.signerUuid,
      text: replyText,
      parent: cast.hash
    });
    
    // Mettre à jour le cache utilisateur
    cache.userCache.set(userCacheKey, now);
    
    // Nettoyer le cache périodiquement
    if (cache.userCache.size > 1000) {
      cleanupCache();
    }
    
    return response.data;
  } catch (error) {
    throw new APIError(
      'Erreur lors de la réponse au message',
      error.response?.status,
      error.response?.data
    );
  }
}

/**
 * Génère une réponse personnalisée en fonction du message
 */
function generateReply(cast) {
  const greetings = ['Bonjour', 'Salut', 'Hey', 'Coucou'];
  const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
  
  return `${randomGreeting} @${cast.author.username} ! Je suis ${CONFIG.botName}, votre assistant Farcaster. \n\nComment puis-je vous aider aujourd'hui ? 😊`;
}

/**
 * Nettoie le cache des utilisateurs
 */
function cleanupCache() {
  const now = Date.now();
  const oneWeekAgo = now - 604800000; // 7 jours en millisecondes
  
  for (const [key, timestamp] of cache.userCache.entries()) {
    if (timestamp < oneWeekAgo) {
      cache.userCache.delete(key);
    }
  }
  console.log('🧹 Cache des utilisateurs nettoyé');
}

// Démarrer la surveillance
console.log(`🤖 ${CONFIG.botName} est en train de surveiller les messages...`);
console.log(`🔑 Mots-clés surveillés: ${CONFIG.keywords.join(', ')}`);

// Exécuter la recherche immédiatement, puis à intervalles réguliers
searchAndReply();
setInterval(searchAndReply, CONFIG.checkInterval);
