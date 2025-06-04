import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
// import { createLogger } from '../config/logger.js'; // Optional
// const logger = createLogger('login-service'); // Optional

// Apply the stealth plugin
puppeteer.use(StealthPlugin());

// Dossier principal pour les données utilisateur
const baseUserDataDir = path.resolve(process.cwd(), './user_data');

// Fonction pour nettoyer les fichiers de verrouillage qui peuvent causer des problèmes
const cleanupLockFiles = (directory) => {
  try {
    // Liste des fichiers de verrouillage à supprimer
    const lockFiles = [
      'SingletonLock',
      'SingletonCookie',
      'SingletonSocket',
      '.com.google.Chrome.*.lock'
    ];

    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
      return;
    }

    // Supprimer les fichiers de verrouillage
    const files = fs.readdirSync(directory);
    for (const file of files) {
      if (lockFiles.some(lockPattern => {
        // Pour les patterns qui contiennent *, utiliser une regex
        if (lockPattern.includes('*')) {
          const regexPattern = new RegExp(lockPattern.replace(/\*/g, '.*'));
          return regexPattern.test(file);
        }
        return file === lockPattern;
      })) {
        const filePath = path.join(directory, file);
        try {
          fs.unlinkSync(filePath);
          console.log(`Suppression du fichier de verrouillage: ${filePath}`);
        } catch (unlinkError) {
          console.warn(`Impossible de supprimer le fichier de verrouillage ${filePath}:`, unlinkError.message);
        }
      }
    }

    // Vérifier si le dossier Default existe pour nettoyer ses fichiers de verrouillage
    const defaultDir = path.join(directory, 'Default');
    if (fs.existsSync(defaultDir)) {
      cleanupLockFiles(defaultDir);
    }
  } catch (error) {
    console.warn('Erreur lors du nettoyage des fichiers de verrouillage:', error.message);
  }
};

// Utiliser un profil persistant unique pour toutes les sessions
const persistentUserDataDir = path.join(baseUserDataDir, 'persistent_profile');

/**
 * Launches a Puppeteer browser instance, navigates to Warpcast,
 * and handles login if necessary.
 * @returns {Promise<import('puppeteer').Page>} Puppeteer page object authenticated with Warpcast.
 */
// Variable globale pour stocker le navigateur et la page entre les appels
let globalBrowser = null;
let globalPage = null;

/**
 * Lance une instance Puppeteer, navigue vers Warpcast et gère la connexion.
 * @param {boolean} forceNewPage - Si true, force la création d'une nouvelle page Puppeteer.
 * @returns {Promise<import('puppeteer').Page>} Puppeteer page object authentifié avec Warpcast.
 */
async function getFarcasterPage(forceNewPage = false) {
  console.log('>>> Appel de getFarcasterPage()');

  // Si on demande explicitement une nouvelle page, fermer l'ancienne
  if (forceNewPage && globalPage) {
    try { await globalPage.close(); } catch (e) { }
    globalPage = null;
  }
  if (forceNewPage && globalBrowser) {
    try { await globalBrowser.close(); } catch (e) { }
    globalBrowser = null;
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  // Si une session est déjà active et valide, on la réutilise
  if (globalBrowser && globalPage) {
    try {
      // Vérifier si la page est toujours utilisable en essayant d'accéder à son URL
      await globalPage.url();
      console.log('>>> Réutilisation de la session Puppeteer existante');
      return globalPage;
    } catch (error) {
      console.log('>>> Session existante invalide, création d\'une nouvelle session');
      // Si erreur, la page n'est plus valide, on ferme le navigateur et on en crée un nouveau
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
        globalBrowser = null;
        globalPage = null;
      }
    }
  }

  // S'assurer que le dossier de profil persistant existe et qu'il n'y a pas de fichiers de verrouillage
  console.log(`>>> Utilisation du profil persistant: ${persistentUserDataDir}`);
  cleanupLockFiles(persistentUserDataDir);

  console.log('>>> Lancement du navigateur Puppeteer');
  try {
    globalBrowser = await puppeteer.launch({
      headless: false, // false pour debug visuel, true en production
      userDataDir: persistentUserDataDir,
      args: [
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-extensions',
        '--mute-audio',
        '--no-sandbox',
        '--disable-setuid-sandbox',
      ]
    });
  } catch (launchError) {
    console.error('Erreur lors du lancement du navigateur:', launchError.message);

    // Si l'erreur concerne SingletonLock, on tente de nettoyer à nouveau et réessayer
    if (launchError.message.includes('SingletonLock') || launchError.message.includes('lock')) {
      try {
        console.log('>>> Nettoyage complet des fichiers de verrouillage et nouvelle tentative...');
        // Nettoyage plus agressif des fichiers de verrouillage
        cleanupLockFiles(persistentUserDataDir);

        // Attendre un peu plus pour s'assurer que les ressources sont libérées
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Réessayer avec un profil persistant
        globalBrowser = await puppeteer.launch({
          headless: true,
          userDataDir: persistentUserDataDir,
          args: [
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--disable-extensions',
            '--mute-audio',
            '--no-sandbox',
            '--disable-setuid-sandbox',
          ]
        });
      } catch (retryError) {
        console.error('Echec de la seconde tentative:', retryError.message);
        throw retryError;
      }
    } else {
      throw launchError;
    }
  }

  globalPage = await globalBrowser.newPage();
  console.log('>>> Page Puppeteer créée');

  // Essayer de charger les cookies d'authentification s'ils existent
  const cookiesPath = path.join(persistentUserDataDir, 'auth_cookies.json');
  if (fs.existsSync(cookiesPath)) {
    try {
      const cookiesJson = fs.readFileSync(cookiesPath, 'utf8');
      const cookies = JSON.parse(cookiesJson);
      if (cookies && cookies.length > 0) {
        console.log('>>> Chargement des cookies d\'authentification précédemment sauvegardés');
        await globalPage.setCookie(...cookies);
      }
    } catch (cookieError) {
      console.warn('>>> Erreur lors du chargement des cookies:', cookieError.message);
    }
  }

  try {
    // Aller directement sur Farcaster.xyz (nouveau portail)
    await globalPage.goto('https://farcaster.xyz/', { waitUntil: 'networkidle2', timeout: 45000 });

    // Si on est redirigé vers un login ou qu'on voit un écran de connexion, initier le processus de connexion par email
    if (globalPage.url().includes('/login')) {
      console.log('[LOGIN] Initiation du processus de connexion par email...');

      // Récupération de l'email depuis les variables d'environnement
      const farcasterEmail = process.env.FARCASTER_EMAIL;

      if (farcasterEmail) {
        try {
          // Sélecteur exact du bouton de connexion par email
          const emailButtonSelector = 'button.rounded-lg.font-semibold.border.bg-action-tertiary.border-action-tertiary';

          // Attendre que le bouton de connexion par email soit visible
          await globalPage.waitForSelector(emailButtonSelector, { timeout: 45000 });
          console.log('>>> Bouton de connexion par email trouvé');

          // Cliquer sur le bouton de connexion par email
          await globalPage.click(emailButtonSelector);
          console.log('>>> Clic sur le bouton de connexion par email');

          // Attendre que le champ d'email apparaisse
          await globalPage.waitForSelector('input[type="email"]', { timeout: 45000 });
          console.log('>>> Champ email trouvé');

          // Saisir l'email
          await globalPage.type('input[type="email"]', farcasterEmail);
          console.log('>>> Email saisi');

          // Trouver et cliquer sur le bouton Continuer/Envoyer
          await globalPage.waitForSelector('button[type="submit"]', { timeout: 45000 });
          await globalPage.click('button[type="submit"]');
          console.log('>>> Clic sur Continuer');

          // Attendre confirmation d'envoi d'email
          try {
            // Attendre un message de confirmation ou une UI montrant que l'email a été envoyé
            await globalPage.waitForFunction(
              () => {
                // Chercher des messages indiquant qu'un email a été envoyé
                const text = document.body.textContent.toLowerCase();
                return text.includes('email sent') ||
                  text.includes('check your email') ||
                  text.includes('email de vérification') ||
                  text.includes('email envoyé');
              },
              { timeout: 45000 }
            );
            console.log('>>> Email de connexion envoyé. Veuillez vérifier votre boîte mail.');
          } catch (confirmError) {
            console.log('>>> Impossible de confirmer l\'envoi d\'email, mais le processus continue');
          }

          // Afficher des instructions pour l'utilisateur
          console.log('\n-----------------------------------------------------');
          console.log('IMPORTANT: Un email de connexion a été envoyé à ' + farcasterEmail);
          console.log('Veuillez ouvrir cet email et cliquer sur le lien de confirmation');
          console.log('Le bot attendra votre connexion avant de continuer...');
          console.log('-----------------------------------------------------\n');

          // Attendre que l'utilisateur termine le processus de connexion
          await globalPage.waitForFunction(
            () => !window.location.pathname.includes('/login') && (document.querySelector('article') || document.querySelector('[data-testid="feed-item"]')),
            { timeout: 300000 } // 5 minutes pour finaliser la connexion via email
          );
          console.log('>>> Connexion détectée!');
        } catch (loginError) {
          console.error('>>> Erreur lors du processus de connexion par email:', loginError.message);
          console.log('>>> Connexion manuelle requise. Veuillez vous connecter dans la fenêtre du navigateur...');

          // Attendre la connexion manuelle
          await globalPage.waitForFunction(
            () => !window.location.pathname.includes('/login') && (document.querySelector('article') || document.querySelector('[data-testid="feed-item"]')),
            { timeout: 300000 } // 5 minutes pour la connexion manuelle
          );
          console.log('>>> Connexion détectée');
        }
      } else {
        console.log('[LOGIN REQUIRED] Variable d\'environnement FARCASTER_EMAIL non définie');
        console.log('[LOGIN REQUIRED] Veuillez vous connecter à Farcaster dans la fenêtre du navigateur. En attente...');

        // Attendre que l'utilisateur se connecte manuellement
        await globalPage.waitForFunction(
          () => !window.location.pathname.includes('/login') && (document.querySelector('article') || document.querySelector('[data-testid="feed-item"]')),
          { timeout: 300000 } // 5 minutes pour la connexion manuelle
        );
        console.log('>>> Connexion détectée');
      }
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
