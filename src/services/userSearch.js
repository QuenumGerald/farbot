import axios from 'axios';

/**
 * Recherche des utilisateurs sur Farcaster par mot-clé
 * @param {string} keyword - Mot-clé à rechercher
 * @returns {Promise<Array>} - Tableau d'objets utilisateur avec { username, displayName, fid, ... }
 */
export async function searchUsersByKeywords(keyword) {
  try {
    const url = `https://farcaster.xyz/~/search/users?q=${encodeURIComponent(keyword)}`;
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      },
    });

    // Si la réponse est en HTML (au lieu de JSON), c'est qu'il y a un problème
    if (typeof response.data === 'string' && response.data.includes('<!DOCTYPE html>')) {
      throw new Error('La réponse est en HTML au lieu de JSON. Vérifiez l\'URL et les en-têtes.');
    }

    // Si la réponse est bien du JSON, retourne les résultats
    if (response.data && Array.isArray(response.data)) {
      return response.data;
    }

    // Si la structure est différente, essaie de l'extraire
    if (response.data && response.data.result && Array.isArray(response.data.result.users)) {
      return response.data.result.users;
    }

    console.error('Format de réponse inattendu :', response.data);
    return [];
  } catch (error) {
    console.error('Erreur lors de la recherche d\'utilisateurs :', error.message);
    if (error.response) {
      console.error('Détails de l\'erreur :', {
        status: error.response.status,
        data: error.response.data,
      });
    }
    throw error;
  }
}

// Exemple d'utilisation :
// const users = await searchUsersByKeywords('crypto');
// console.log('Utilisateurs trouvés :', users);
