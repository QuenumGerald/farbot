import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import path from 'path';
// import { createLogger } from '../config/logger.js'; // Optional
// const logger = createLogger('login-service'); // Optional

// Apply the stealth plugin
puppeteer.use(StealthPlugin());

const userDataDir = path.resolve(process.cwd(), './user_data');

/**
 * Launches a Puppeteer browser instance, navigates to Warpcast,
 * and handles login if necessary.
 * @returns {Promise<import('puppeteer').Page>} Puppeteer page object authenticated with Warpcast.
 */
// Variable globale pour stocker le navigateur et la page entre les appels
let globalBrowser = null;
let globalPage = null;

async function getFarcasterPage() {
  console.log('>>> Appel de getFarcasterPage()');
  
  // Si une instance de navigateur existe, on la ferme d'abord
  if (globalBrowser) {
    console.log('>>> Fermeture de l\'instance Puppeteer existante');
    try {
      if (globalPage) {
        await globalPage.close().catch(e => console.warn('Erreur fermeture page:', e.message));
        globalPage = null;
      }
      await globalBrowser.close().catch(e => console.warn('Erreur fermeture navigateur:', e.message));
      globalBrowser = null;
      // Attendre un peu pour que le système libère les ressources
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (closeError) {
      console.warn('Erreur lors de la fermeture du navigateur:', closeError.message);
      // On continue malgré l'erreur
    }
  }

  // Supprimer le fichier de verrouillage s'il existe
  const lockFile = path.join(userDataDir, 'SingletonLock');
  if (fs.existsSync(lockFile)) {
    console.log('>>> Suppression du fichier de verrouillage SingletonLock');
    try {
      fs.unlinkSync(lockFile);
    } catch (unlinkErr) {
      console.warn('Impossible de supprimer le fichier de verrouillage:', unlinkErr.message);
    }
  }
  
  // Ensure user_data directory exists
  if (!fs.existsSync(userDataDir)) {
    fs.mkdirSync(userDataDir, { recursive: true });
  }

  console.log('>>> Lancement du navigateur Puppeteer');
  globalBrowser = await puppeteer.launch({
    headless: false,
    userDataDir: userDataDir,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu'
    ]
  });

  globalPage = await globalBrowser.newPage();
  console.log('>>> Page Puppeteer créée');

  try {
    // Aller directement sur Farcaster.xyz (nouveau portail)
    await globalPage.goto('https://farcaster.xyz/', { waitUntil: 'networkidle2', timeout: 60000 });

    // Si on est redirigé vers un login ou qu'on voit un écran de connexion, attendre la connexion utilisateur
    if (globalPage.url().includes('/login')) {
      console.log('[LOGIN REQUIRED] Veuillez vous connecter à Farcaster dans la fenêtre du navigateur. En attente...');

      // Attendre que l'utilisateur se connecte
      await globalPage.waitForFunction(
        () => !window.location.pathname.includes('/login') && (document.querySelector('article') || document.querySelector('[data-testid="feed-item"]')),
        { timeout: 300000 } // 5 minutes pour la connexion manuelle
      );
      console.log('>>> Connexion détectée');
    } else {
      console.log('>>> Utilisateur déjà connecté');
    }
    
    return globalPage;
  } catch (error) {
    console.error('Erreur dans getFarcasterPage:', error.message);
    // En cas d'erreur, fermer le navigateur avant de lancer l'exception
    if (globalBrowser) {
      console.log('>>> Fermeture du navigateur suite à une erreur');
      await globalBrowser.close();
      globalBrowser = null;
      globalPage = null;
    }
    throw error;
  }
}

export { getFarcasterPage };
