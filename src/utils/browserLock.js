import fs from 'fs';
import path from 'path';

const lockFilePath = path.resolve(process.cwd(), 'browser.lock');
const MAX_LOCK_WAIT_MS = 60000; // 1 minute max d'attente
const LOCK_CHECK_INTERVAL_MS = 500; // Vérifier toutes les 500ms

/**
 * Vérifie si le navigateur est actuellement verrouillé par un autre processus
 * @returns {boolean} true si verrouillé, false sinon
 */
export function isBrowserLocked() {
  return fs.existsSync(lockFilePath);
}

/**
 * Crée un verrou pour le navigateur
 * @param {string} processId - Identifiant du processus qui verrouille (pour debug)
 * @returns {boolean} true si le verrou a été créé avec succès
 */
export function lockBrowser(processId = 'unknown') {
  try {
    if (isBrowserLocked()) {
      return false;
    }
    
    fs.writeFileSync(lockFilePath, processId.toString(), 'utf8');
    return true;
  } catch (error) {
    console.error('Erreur lors du verrouillage du navigateur:', error.message);
    return false;
  }
}

/**
 * Libère le verrou du navigateur
 */
export function unlockBrowser() {
  try {
    if (fs.existsSync(lockFilePath)) {
      fs.unlinkSync(lockFilePath);
    }
  } catch (error) {
    console.error('Erreur lors du déverrouillage du navigateur:', error.message);
  }
}

/**
 * Attend que le navigateur soit disponible (non verrouillé)
 * @param {string} processId - Identifiant du processus qui attend
 * @returns {Promise<boolean>} true si le verrou a été acquis, false si timeout
 */
export async function waitForBrowserLock(processId = 'unknown') {
  const startTime = Date.now();
  
  while (isBrowserLocked()) {
    await new Promise(resolve => setTimeout(resolve, LOCK_CHECK_INTERVAL_MS));
    
    // Si on a dépassé le temps maximum d'attente
    if (Date.now() - startTime > MAX_LOCK_WAIT_MS) {
      console.error(`Timeout en attendant le verrou du navigateur (processus ${processId})`);
      return false;
    }
  }
  
  // Acquérir le verrou
  return lockBrowser(processId);
}

/**
 * Supprime les verrous "fantômes" si l'application a planté
 * À exécuter au démarrage de l'application
 */
export function cleanupStaleLocks() {
  try {
    unlockBrowser();
    console.log('Nettoyage des verrous de navigateur effectué');
  } catch (error) {
    console.error('Erreur lors du nettoyage des verrous:', error.message);
  }
}
