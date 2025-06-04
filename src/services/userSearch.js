import { getFarcasterPage } from './login.js';

/**
 * Recherche des utilisateurs sur Farcaster par mot-clé
 * @param {string} keyword - Mot-clé à rechercher
 * @returns {Promise<Array>} - Tableau d'objets utilisateur avec { username, displayName, fid, ... }
 */
export async function searchUsersByKeywords(keyword) {
  // Utiliser Puppeteer au lieu d'appels API directs
  let page = null;
  try {
    // Tentatives multiples pour gérer les erreurs de connexion
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      try {
        page = await getFarcasterPage();
        
        // Utiliser l'URL de recherche d'utilisateurs
        const searchUrl = `https://farcaster.xyz/~/search/users?q=${encodeURIComponent(keyword)}`;
        console.log(`Recherche d'utilisateurs en cours sur: ${searchUrl} (tentative ${attempts + 1}/${maxAttempts})`);
        
        // Tentative de navigation avec timeout plus long
        await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 15000 });
        break; // Si la navigation réussit, sortir de la boucle
      } catch (navigationError) {
        attempts++;
        console.log(`Erreur de navigation (tentative ${attempts}/${maxAttempts}):`, navigationError.message);
        
        // Si c'est la dernière tentative, remonter l'erreur
        if (attempts >= maxAttempts) throw navigationError;
        
        // Sinon, attendre et réessayer
        await new Promise(resolve => setTimeout(resolve, 2000));
        // Fermer la page pour en créer une nouvelle
        if (page) {
          try {
            await page.close().catch(() => {});
          } catch (e) { /* ignorer */ }
        }
      }
    }
    
    // Attendre que la page charge complètement
    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 3000)));

    // --- Ajout scroll automatique pour charger plus de profils ---
    const scrollTimes = 5;
    for (let i = 0; i < scrollTimes; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 1500)));
    }
    // --- Fin scroll ---

    // Extraire les utilisateurs de la page avec un sélecteur générique pour les profils d'utilisateurs
    const users = await page.evaluate(() => {
      const results = [];
      
      // Sélectionner tous les profils d'utilisateurs sur la page
      // Utiliser un sélecteur large pour les cartes de profil
      const userCards = document.querySelectorAll('div.relative.flex.flex-row, div.cursor-pointer');
      
      userCards.forEach(card => {
        try {
          // Essayer d'extraire le nom d'utilisateur et le displayName
          const usernameElement = card.querySelector('div.text-muted, span.text-muted');
          const displayNameElement = card.querySelector('span.font-semibold, div.font-semibold');
          
          // Essayer de trouver le bouton Follow ou un lien vers le profil
          const profileLink = card.querySelector('a[href^="/"]');
          
          if (usernameElement || displayNameElement) {
            const username = usernameElement ? usernameElement.textContent.trim().replace('@', '') : '';
            const displayName = displayNameElement ? displayNameElement.textContent.trim() : '';
            const href = profileLink ? profileLink.getAttribute('href') : '';
            
            // Vérifier que c'est bien un profil utilisateur (pas un message)
            if (username || (href && href.indexOf('/cast/') === -1)) {
              results.push({
                username: username,
                displayName: displayName || username,
                href: href
              });
            }
          }
        } catch (e) {
          // Ignorer les erreurs d'extraction pour cet utilisateur
        }
      });
      
      return results;
    });
    
    console.log(`Trouvé ${users.length} utilisateurs potentiels avec le mot-clé "${keyword}"`);
    return users;
  } catch (error) {
    console.error(`Erreur lors de la recherche d'utilisateurs avec le mot-clé "${keyword}" :`, error.message);
    return [];
  }
}

// Exemple d'utilisation :
// const users = await searchUsersByKeywords('crypto');
// console.log('Utilisateurs trouvés :', users);
