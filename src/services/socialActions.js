import { getFarcasterPage } from './login.js';
import fs from 'fs';
import path from 'path';
import { searchUsersByKeywords } from './userSearch.js';

class SocialActions {
  // Utilitaire pour extraire les 10 premiers mots d'un message
  static getFirst10Words(text) {
    if (!text) return '';
    return text.split(/\s+/).slice(0, 10).join(' ').toLowerCase();
  }

  // Vérifie si l'auteur a déjà reçu une réponse dans les 15 derniers jours
  static hasRespondedToAuthorRecently(history, author, daysThreshold = 15) {
    if (!author || !history) return false;

    const now = new Date();
    const authorLower = author.toLowerCase();

    // Parcourir tous les messages dans l'historique
    for (const key in history) {
      const entry = history[key];

      // Vérifier si l'auteur correspond et si la réponse a été envoyée
      if (entry.author && entry.author.toLowerCase() === authorLower && entry.responded) {
        // Vérifier la date (si moins de X jours)
        const responseDate = new Date(entry.date);
        const diffTime = Math.abs(now - responseDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < daysThreshold) {
          return true; // A répondu à cet auteur récemment
        }
      }
    }

    return false; // Pas de réponse récente à cet auteur
  }

  // Chemin absolu vers le fichier d'historique des réponses
  static getHistoryPath() {
    return path.resolve(process.cwd(), 'reply_history.json');
  }

  // Chemin absolu vers le fichier d'historique des suivis
  static getFollowHistoryPath() {
    return path.resolve(process.cwd(), 'follow_history.json');
  }

  // Charge l'historique des réponses (clé = 10 premiers mots)
  static loadReplyHistory() {
    const file = SocialActions.getHistoryPath();
    if (!fs.existsSync(file)) return {};
    try {
      const data = fs.readFileSync(file, 'utf8');
      return JSON.parse(data);
    } catch (e) {
      console.error('Erreur lecture historique:', e.message);
      return {};
    }
  }

  // Sauvegarde l'historique des réponses
  static saveReplyHistory(history) {
    const file = SocialActions.getHistoryPath();
    try {
      fs.writeFileSync(file, JSON.stringify(history, null, 2), 'utf8');
    } catch (e) {
      console.error('Erreur sauvegarde historique:', e.message);
    }
  }

  // Charge l'historique des utilisateurs suivis
  static loadFollowHistory() {
    const file = SocialActions.getFollowHistoryPath();
    if (!fs.existsSync(file)) return {};
    try {
      const data = fs.readFileSync(file, 'utf8');
      return JSON.parse(data);
    } catch (e) {
      console.error('Erreur lecture historique de follow:', e.message);
      return {};
    }
  }

  // Sauvegarde l'historique des utilisateurs suivis
  static saveFollowHistory(history) {
    const file = SocialActions.getFollowHistoryPath();
    try {
      fs.writeFileSync(file, JSON.stringify(history, null, 2), 'utf8');
    } catch (e) {
      console.error('Erreur sauvegarde historique de follow:', e.message);
    }
  }

  constructor() {
    this.page = null;
  }

  /**
   * Initialise la page si ce n'est pas déjà fait ou rafraîchit la page existante
   * @param {boolean} forceRefresh - Force une nouvelle page même si une existe déjà
   */
  async ensurePage(forceRefresh = false) {
    try {
      // Si on force le rafraîchissement ou si la page n'existe pas ou est détachée/fermée
      let needNewPage = forceRefresh;
      if (this.page) {
        // Vérifie si la page est fermée ou détachée (frame detached)
        try {
          if (typeof this.page.isClosed === 'function' && this.page.isClosed()) {
            needNewPage = true;
          } else if (this.page.mainFrame && typeof this.page.mainFrame === 'function') {
            const mainFrame = this.page.mainFrame();
            if (mainFrame && mainFrame._detached) {
              needNewPage = true;
            }
          }
        } catch (e) {
          // Si une erreur survient, on préfère recréer la page
          needNewPage = true;
        }
      } else {
        needNewPage = true;
      }

      if (needNewPage) {
        // Fermer l'ancienne page si elle existe
        if (this.page) {
          try {
            await this.page.close().catch(e => console.warn('Erreur fermeture page:', e.message));
          } catch (e) {
            console.warn('Erreur fermeture page:', e.message);
          }
          this.page = null;
        }
        // Créer une nouvelle page (force refresh)
        this.page = await getFarcasterPage(true);
      }
      return this.page;
    } catch (error) {
      console.error("Erreur lors de l'initialisation de la page:", error.message);
      // En cas d'erreur critique, réinitialiser complètement
      this.page = null;
      return await getFarcasterPage();
    }
  }

  async navigateWithRetries(url, maxRetries = 3) {
    let currentPage;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Force refresh page on retries (after 1st attempt) to ensure a clean state
        currentPage = await this.ensurePage(attempt > 1);

        // Navigue vers l'URL avec un timeout plus long
        await currentPage.goto(url, {
          waitUntil: 'networkidle2',
          timeout: 45000  // Augmenter le timeout à 45 secondes
        });

        // Attendre que la page soit bien chargée et stabilisée
        await currentPage.evaluate(() => new Promise(r => setTimeout(r, 3000)));

        // Vérifier que la page n'est pas détachée en essayant d'accéder à son titre
        await currentPage.title();

        console.log(`Navigation réussie vers ${url} (tentative ${attempt}/${maxRetries})`);
        return true;
      } catch (error) {
        console.error(`Erreur de navigation vers ${url} (tentative ${attempt}/${maxRetries}): ${error.message}`);
        if (attempt === maxRetries) {
          console.error(`Échec final de la navigation vers ${url} après ${maxRetries} tentatives.`);
          return false;
        }
        await new Promise(resolve => setTimeout(resolve, 3000 * attempt)); // Attendre plus longtemps entre les tentatives
      }
    }
    return false;
  }

  /**
   * Recherche des messages par mot-clé
   * @param {string} keyword - Mot-clé à rechercher
   * @param {string} type - Type de recherche ('users' pour utilisateurs, 'recent' pour messages récents)
   * @returns {Promise<Array>} - Liste des messages trouvés
   */
  async searchMessages(keyword, type = 'recent') {
    const page = await this.ensurePage();

    try {
      // Utilise l'URL adaptée selon le type de recherche
      const searchUrl = `https://farcaster.xyz/~/search/${type}?q=${encodeURIComponent(keyword)}`;
      console.log(`Recherche en cours sur: ${searchUrl}`);

      await page.goto(searchUrl, {
        waitUntil: 'networkidle2',
        timeout: 45000
      });

      // Attendre que la page charge complètement
      // Utilise setTimeout car waitForTimeout n'est pas disponible
      await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 5000)));

      // Extraire les messages avec des sélecteurs plus génériques adaptés à la nouvelle interface
      return await page.evaluate(() => {
        const results = [];
        // Utilise des sélecteurs génériques pour les messages
        const messages = document.querySelectorAll('article, [role="article"], div.cast, .cast-container');

        console.log(`Trouvé ${messages.length} éléments potentiels`);

        messages.forEach(msg => {
          try {
            // Récupère l'auteur et le contenu avec des sélecteurs génériques
            const author = msg.querySelector('a[href^="/"], .username, .author')?.textContent?.trim();
            const content = msg.querySelector('p, .text, .content')?.textContent?.trim();
            const url = msg.querySelector('a[href*="/cast/"]')?.href || msg.querySelector('a')?.href;

            if (author && content) {
              results.push({ author, content, url });
              console.log(`Message trouvé: ${author} - ${content.substring(0, 30)}...`);
            }
          } catch (e) {
            console.log('Erreur lors de l\'extraction d\'un message');
          }
        });

        return results;
      });
    } catch (error) {
      console.error('Erreur lors de la recherche de messages :', error);
      return [];
    }
  }

  /**
   * Répond à un message
   * @param {string} messageUrl - URL du message
   * @param {string} response - Texte de la réponse
   * @returns {Promise<boolean>} - Succès ou échec
   */
  async replyToMessage(messageUrl, response) {
    const page = await this.ensurePage();

    try {
      await page.goto(messageUrl, { waitUntil: 'networkidle2' });

      // Cliquer sur le bouton de réponse avec le sélecteur exact fourni par l'utilisateur
      console.log('Recherche du bouton de réponse...');

      // Sélecteur exact pour le bouton de réponse dans la nouvelle interface
      const replyButton = await page.$('div.group.flex.w-max.flex-row.items-center.text-sm.text-faint.cursor-pointer, div.group:has(svg path[d*="M1.625 3.09375"]), div:has(svg):has(path[fill="#9FA3AF"])');

      if (!replyButton) {
        console.log('Bouton de réponse standard non trouvé, recherche alternative...');

        // Essayer de trouver le conteneur avec l'icône SVG du message
        const elements = await page.$$('div.group.flex');
        let found = false;

        for (const el of elements) {
          const hasSVG = await page.evaluate(el => {
            return el.querySelector('svg') !== null && el.classList.contains('cursor-pointer');
          }, el);

          if (hasSVG) {
            console.log('Trouvé un élément avec SVG qui pourrait être le bouton de réponse');
            await el.click();
            found = true;
            break;
          }
        }

        if (!found) throw new Error('Bouton de réponse introuvable');
      } else {
        console.log('Bouton de réponse trouvé, clic...');
        await replyButton.click();
      }

      // Attendre que la page charge complètement
      // Utilise setTimeout car waitForTimeout n'est pas disponible
      await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 5000)));

      // Attendre l'ouverture de la modale et le champ de texte
      console.log('Attente de la modale de réponse...');
      await page.waitForSelector('div[role="textbox"], [contenteditable="true"], textarea', { visible: true, timeout: 45000 });

      // Remplir le formulaire de réponse
      console.log('Saisie du message de réponse...');
      await page.type('div[role="textbox"], [contenteditable="true"], textarea', response);

      // Envoyer la réponse avec le nouveau sélecteur du bouton de validation
      console.log('Recherche du bouton de validation (Reply)...');
      const sendButton = await page.$('button.rounded-lg.font-semibold[title="Reply"], button.bg-action-primary.text-light, button:has(text="Reply")');

      if (!sendButton) {
        console.log('Bouton Reply standard non trouvé, recherche alternative...');

        // Recherche par texte
        const buttons = await page.$$('button');
        let found = false;

        for (const btn of buttons) {
          const text = await page.evaluate(el => el.textContent?.trim(), btn);
          if (text === 'Reply') {
            console.log('Bouton Reply trouvé par texte');
            await btn.click();
            found = true;
            break;
          }
        }

        if (!found) throw new Error('Bouton de validation (Reply) introuvable');
      } else {
        console.log('Bouton Reply trouvé, envoi de la réponse...');
        await sendButton.click();
      }

      // Attente après l'envoi pour confirmation
      // Utilise setTimeout car waitForTimeout n'est pas disponible
      await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 3000)));

      return true;
    } catch (error) {
      console.error('Erreur lors de l\'envoi de la réponse :', error);
      return false;
    }
  }

  /**
   * Ferme la page
   */
  async close() {
    if (this.page) {
      try {
        await this.page.close().catch(e => console.warn('Erreur fermeture page:', e.message));
      } catch (e) {
        console.warn('Erreur lors de la fermeture de la page:', e.message);
      }
      this.page = null;
    }
  }

  /**
   * Stabilise l'environnement Puppeteer - ferme et réouvre la page
   * @returns {Promise<import('puppeteer').Page>} La nouvelle page
   */
  async stabilize() {
    console.log('Stabilisation de l\'environnement Puppeteer...');
    await this.close();
    // Attendre un peu pour s'assurer que les ressources sont libérées
    await new Promise(resolve => setTimeout(resolve, 2000));
    const newPage = await this.ensurePage(true);
    console.log('Environnement Puppeteer stabilisé');
    return newPage;
  }

  /**
   * Recherche des messages et y répond directement sur la page de recherche
   * @param {string} keyword - Mot-clé à rechercher
   * @param {string} type - Type de recherche ('users' ou 'recent')
   * @param {Function} generateResponse - Fonction pour générer une réponse (via Gemini)
   * @param {number} maxResponses - Nombre maximum de réponses à envoyer
   * @param {Array<string>} [replyKeywords] - Liste optionnelle de mots-clés pour filtrer les messages avant de répondre
   * @returns {Promise<number>} - Nombre de réponses envoyées
   */
  async searchAndReplyInline(keyword, type = 'recent', generateResponse, maxResponses = 3, replyKeywords = []) {
    // Forcer une nouvelle page pour plus de stabilité
    const page = await this.ensurePage(true);
    let responsesCount = 0;
    let skippedCount = 0;

    try {
      // Utilise l'URL adaptée selon le type de recherche
      const searchUrl = `https://farcaster.xyz/~/search/${type}?q=${encodeURIComponent(keyword)}`;
      console.log(`Recherche en cours sur: ${searchUrl}`);

      await page.goto(searchUrl, {
        waitUntil: 'networkidle2',
        timeout: 45000
      });

      // Attendre que la page charge complètement
      await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 5000)));

      // Trouver tous les messages sur la page de recherche
      console.log('Recherche des messages sur la page...');
      const messageItems = await page.$$('.relative.cursor-pointer.px-4.py-2, div.cursor-pointer:has(div.line-clamp-feed)');
      console.log(`Trouvé ${messageItems.length} messages potentiels`);

      // Charger l'historique des réponses
      const replyHistory = SocialActions.loadReplyHistory();
      // Parcourir chaque message jusqu'à ce qu'on ait envoyé suffisamment de réponses
      // ou qu'on ait parcouru tous les messages disponibles
      for (let i = 0; i < messageItems.length && responsesCount < maxResponses; i++) {
        try {
          const messageItem = messageItems[i];

          // Extraire le contenu du message pour la réponse
          const content = await page.evaluate(el => {
            const textElement = el.querySelector('.line-clamp-feed');
            return textElement ? textElement.textContent.trim() : '';
          }, messageItem);

          // Calculer les 10 premiers mots une seule fois pour ce message
          const first10 = SocialActions.getFirst10Words(content);

          // Extraire l'auteur du message (sélecteur précis pour l'auteur)
          const author = await page.evaluate(el => {
            // Essayer plusieurs sélecteurs possibles pour trouver l'auteur
            const authorElement =
              el.querySelector('span a.font-semibold') || // Sélecteur spécifique pour les noms d'auteurs
              el.querySelector('div.font-semibold') ||
              el.querySelector('a[href^="/"]:not([href*="/~/"])');

            const authorName = authorElement ? authorElement.textContent.trim() : '';
            return authorName || 'utilisateur_inconnu';
          }, messageItem);

          if (!content) {
            console.log('Message sans contenu, passage au suivant');
            continue;
          }

          console.log(`Message ${i + 1}/${messageItems.length} par ${author}: ${content.substring(0, 30)}...`);

          // Vérifier si le message contient un des mots-clés de réponse (si spécifiés)
          if (replyKeywords.length > 0) {
            const hasReplyKeyword = replyKeywords.some(kw =>
              content.toLowerCase().includes(kw.toLowerCase())
            );

            if (!hasReplyKeyword) {
              console.log('Aucun mot-clé de réponse trouvé dans le message, passage au suivant');
              skippedCount++;
              continue;
            }
          }

          // Trouver le bouton de réponse dans ce message en utilisant la structure HTML exacte
          console.log('Recherche du bouton de réponse avec le sélecteur exact...');

          // Sélecteur EXACT basé sur le HTML fourni par l'utilisateur
          let replyButton = await messageItem.$('div.group.flex.w-max.flex-row.items-center.text-sm.text-faint.cursor-pointer');

          // Sélecteur alternatif contenant le SVG spécifique du bouton de réponse
          if (!replyButton) {
            replyButton = await messageItem.$('div:has(svg path[d^="M1.625 3.09375"][fill="#9FA3AF"])');
          }

          // Sélecteur alternatif pour le conteneur avec son contenu distinctif
          if (!replyButton) {
            replyButton = await messageItem.$('.group.flex:has(svg path[fill="#9FA3AF"])');
          }

          // Méthode fiable: Sélectionner les boutons d'action et prendre celui qui contient le path spécifique
          if (!replyButton) {
            try {
              // Récupérer tous les boutons avec des SVG
              const allButtons = await messageItem.$$('div.group.flex');
              console.log(`Trouvé ${allButtons.length} boutons potentiels`);

              // Vérifier chaque bouton pour trouver celui qui contient le path spécifique
              for (const button of allButtons) {
                const hasCommentIcon = await button.evaluate(el => {
                  // Vérifier si l'élément contient un SVG avec le path spécifique du bouton de commentaire
                  const svgPath = el.querySelector('svg path');
                  return svgPath && svgPath.getAttribute('d') &&
                    svgPath.getAttribute('d').startsWith('M1.625 3.09375');
                });

                if (hasCommentIcon) {
                  replyButton = button;
                  console.log('Bouton de réponse trouvé par l\'icone de commentaire');
                  break;
                }
              }
            } catch (error) {
              console.error('Erreur lors de la recherche du bouton de réponse:', error.message);
            }
          }

          if (!replyButton) {
            console.log('Bouton de réponse introuvable après toutes les stratégies, passage au message suivant');
            continue;
          }

          console.log('Bouton de réponse trouvé !');

          // Vérifier si on a déjà répondu à ce message (par les 10 premiers mots)
          if (replyHistory[first10]) {
            console.log('Déjà répondu à ce message (10 premiers mots identiques), passage au suivant');
            skippedCount++;
            continue;
          }

          // Vérifier si on a déjà répondu à cet auteur dans les 15 derniers jours
          if (SocialActions.hasRespondedToAuthorRecently(replyHistory, author)) {
            console.log(`Déjà répondu à l'auteur "${author}" dans les 15 derniers jours, passage au suivant`);
            skippedCount++;
            continue;
          }

          // Générer une réponse avec Gemini
          console.log('Génération d\'une réponse avec Gemini...');
          const response = await generateResponse(content, author);

          if (!response) {
            console.log('Pas de réponse générée, passage au suivant');
            continue;
          }

          console.log(`Réponse générée: ${response.substring(0, 30)}...`);

          // Cliquer sur le bouton de réponse
          console.log('Clic sur le bouton de réponse...');

          try {
            // Vérifier que le bouton est toujours attaché à la page
            await replyButton.click();
          } catch (clickError) {
            console.error('Erreur lors du clic sur le bouton de réponse:', clickError.message);
            continue; // Passer au message suivant en cas d'erreur
          }

          // Attendre l'ouverture de la modale avec un délai plus long
          await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 5000)));

          // Vérifier si la modale est ouverte
          const modalVisible = await page.evaluate(() => {
            return !!document.querySelector('div[role="textbox"], [contenteditable="true"], textarea');
          });

          if (!modalVisible) {
            console.log('La modale de réponse ne s\'est pas ouverte correctement, on passe au message suivant');
            continue;
          }

          // Saisir la réponse - utiliser try/catch pour éviter les erreurs de timeout
          try {
            await page.waitForSelector('div[role="textbox"], [contenteditable="true"], textarea', { visible: true, timeout: 45000 });
          } catch (selectorError) {
            console.error('Erreur lors de l\'attente du champ de texte:', selectorError.message);
            continue; // Passer au message suivant si le champ de texte n'est pas trouvé
          }
          console.log('Saisie de la réponse...');
          await page.type('div[role="textbox"], [contenteditable="true"], textarea', response);

          // Cliquer sur le bouton d'envoi avec le sélecteur exact fourni par l'utilisateur
          console.log('Recherche du bouton d\'envoi...');

          // Sélecteur exact du bouton Reply fourni par l'utilisateur
          const exactSelector = 'button.rounded-lg.font-semibold.border.border-transparent.bg-action-primary.text-light[title="Reply"]';

          // Attendre un peu que le bouton soit vraiment cliquable
          await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 1000)));

          try {
            // D'abord, essayer le sélecteur exact
            let sendButton = await page.$(exactSelector);

            // Si le sélecteur exact ne fonctionne pas, essayer des alternatives
            if (!sendButton) {
              sendButton = await page.$('button.rounded-lg.font-semibold[title="Reply"]');
            }

            if (!sendButton) {
              sendButton = await page.$('button.bg-action-primary.text-light');
            }

            // Si aucun sélecteur CSS ne fonctionne, rechercher par texte
            if (!sendButton) {
              console.log('Bouton d\'envoi introuvable par sélecteur, recherche par texte');
              const buttons = await page.$$('button');

              for (const btn of buttons) {
                const text = await page.evaluate(el => el.textContent?.trim(), btn);
                if (text === 'Reply') {
                  sendButton = btn;
                  console.log('Bouton Reply trouvé par texte');
                  break;
                }
              }
            }

            if (!sendButton) {
              // Si le bouton n'est toujours pas trouvé, utiliser un clic JavaScript directement
              console.log('Essai de clic JavaScript direct sur le bouton Reply...');
              await page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button'));
                const replyButton = buttons.find(btn => btn.textContent?.trim() === 'Reply');
                if (replyButton) {
                  replyButton.click();
                  return true;
                }
                return false;
              });
            } else {
              // Si le bouton est trouvé, utiliser plusieurs méthodes de clic pour s'assurer qu'il fonctionne
              console.log('Bouton d\'envoi trouvé, tentative de clic multiple...');

              // Méthode 1: Clic standard via Puppeteer
              await sendButton.click();

              // Méthode 2: Clic via JavaScript evaluate
              await page.evaluate(element => {
                element.click();
              }, sendButton);

              // Méthode 3: Clic via event dispatch
              await page.evaluate(element => {
                const event = new MouseEvent('click', {
                  bubbles: true,
                  cancelable: true,
                  view: window
                });
                element.dispatchEvent(event);
              }, sendButton);
            }

          } catch (error) {
            console.error('Erreur lors du clic sur le bouton d\'envoi:', error.message);
            // Essayer de fermer la modale en appuyant sur Escape
            await page.keyboard.press('Escape');
            await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 2000)));
            continue;
          }

          // Attendre la confirmation d'envoi
          await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 3000)));
          console.log('Réponse envoyée avec succès!');
          responsesCount++;

          // Enregistrer dans l'historique que ce message a reçu une réponse
          replyHistory[first10] = {
            author,
            date: new Date().toISOString(),
            responded: true
          };
          SocialActions.saveReplyHistory(replyHistory);

          // Attendre un peu avant de passer au message suivant pour éviter rate limits
          await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 5000)));

        } catch (error) {
          console.error(`Erreur lors du traitement du message ${i + 1}:`, error);
          // Continuer avec le prochain message
          await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 3000)));
        }
      }

      console.log(`Traitement terminé. Résultats: ${responsesCount} réponses envoyées, ${skippedCount} messages ignorés (déjà répondus ou auteur récent).`);
      // Note: On n'a pas atteint le nombre max de réponses si on a parcouru tous les messages
      if (responsesCount < maxResponses && messageItems.length > 0) {
        console.log(`Note: Nombre maximum de réponses (${maxResponses}) non atteint. Tous les messages restants ont déjà reçu une réponse ou ne possèdent pas de bouton de réponse.`);
      }
      return responsesCount;

    } catch (error) {
      console.error('Erreur lors de la recherche et réponse aux messages:', error);
      return responsesCount;
    }
  }

  /**
   * Recherche des utilisateurs par mot-clé et les suit automatiquement
   * @returns {Promise<number>} - Nombre d'utilisateurs suivis
   */
  async searchAndFollowUsers() {
    let followCount = 0;
    const maxFollows = 10; // Nombre maximum d'utilisateurs à suivre par session
    let page = null;

    // Importer la configuration pour accéder aux mots-clés
    const { cryptoKeywords } = (await import('../config/index.js')).default;

    // Sélectionner un mot-clé aléatoire
    const keyword = cryptoKeywords[Math.floor(Math.random() * cryptoKeywords.length)];
    console.log(`Recherche d'utilisateurs avec le mot-clé: ${keyword}`);

    // Charger l'historique des follows
    const followHistory = SocialActions.loadFollowHistory();

    try {

      // Utiliser la page existante ou en créer une nouvelle si nécessaire
      page = await this.ensurePage(false);  // false = ne pas forcer la création d'une nouvelle page

      // Recherche et scroll jusqu'à trouver des utilisateurs non suivis
      let users = [];
      let lastUsersCount = 0;
      let scrollAttempts = 0;
      const maxScrollAttempts = 10; // Limite de sécurité pour éviter boucle infinie
      let foundFollowable = false;

      while (scrollAttempts < maxScrollAttempts && !foundFollowable) {
        try {
          users = await searchUsersByKeywords(keyword);
          console.log(`[Scroll ${scrollAttempts}] ${users.length} utilisateurs trouvés avec le mot-clé "${keyword}"`);
        } catch (searchError) {
          console.error(`[Scroll ${scrollAttempts}] Erreur lors de la recherche d'utilisateurs:`, searchError.message);
          break;
        }
        // Cherche au moins un utilisateur non suivi
        for (const user of users) {
          const username = user.username || user.displayName || '';
          if (!username) continue;
          const userKey = username.toLowerCase();
          // Vérifie l'historique local ET la page (bouton Following)
          if (!followHistory[userKey]) {
            foundFollowable = true;
            break;
          }
        }
        if (!foundFollowable) {
          // Scroll pour charger plus d'utilisateurs
          await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
          await page.waitForTimeout(2000);
        }
        if (users.length === lastUsersCount) {
          console.log('Plus de nouveaux utilisateurs à charger, arrêt du scroll.');
          break;
        }
        lastUsersCount = users.length;
        scrollAttempts++;
      }

      if (!foundFollowable) {
        console.log('Aucun utilisateur followable trouvé après scroll.');
        return followCount;
      }

      // Parcourir les utilisateurs trouvés jusqu'à atteindre le nombre maximum de follows
      for (const user of users) {
        if (followCount >= maxFollows) {
          console.log(`Nombre maximum de follows atteint (${maxFollows}).`);
          break;
        }

        const username = user.username || user.displayName || '';

        if (!username) {
          console.log('Utilisateur sans nom d\'utilisateur, on passe au suivant');
          continue;
        }

        const userKey = username.toLowerCase();
        const daysThreshold = 30; // Ne pas refollow avant 30 jours

        // Vérifier si déjà suivi récemment
        if (followHistory[userKey]) {
          const followDate = new Date(followHistory[userKey].date);
          const now = new Date();
          const diffTime = Math.abs(now - followDate);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays < daysThreshold) {
            console.log(`Déjà suivi ${username} dans les ${daysThreshold} derniers jours, on passe au suivant`);
            continue;
          }
        }

        // Essayer de naviguer vers le profil avec plusieurs tentatives
        const profileUrl = `https://farcaster.xyz/${username}`;
        console.log(`Navigation vers le profil: ${profileUrl}`);

        // Tenter de naviguer avec réessais
        const navigationSuccess = await this.navigateWithRetries(profileUrl);
        if (!navigationSuccess) {
          console.log(`Échec de la navigation vers le profil de ${username} après plusieurs tentatives`);
          continue;
        }

        // Attendre le chargement complet et vérifier la présence du bouton
        try {
          // Attendre d'abord que la page soit complètement chargée et statisée pour éviter les frames détachés
          await page.evaluate(() => new Promise(resolve => {
            // Attendre que la page soit stable
            setTimeout(resolve, 3000);
          }));

          // S'assurer que le frame est toujours valide avant de continuer
          try {
            await page.title(); // Simple vérification de validité du frame
          } catch (frameError) {
            console.error(`Frame détaché avant la recherche du bouton Follow pour ${username}`);
            // Essayer de récupérer la page si possible
            page = await this.ensurePage(true);
            await page.goto(`https://farcaster.xyz/${username}`, { waitUntil: 'networkidle2', timeout: 30000 });
            await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 3000)));
          }

          // Utiliser un sélecteur CSS plus précis basé sur les classes du bouton
          const followBtnSelector = 'button.rounded-lg.font-semibold.border.border-transparent.bg-action-primary.text-light';
          await page.waitForSelector(followBtnSelector, { timeout: 45000 });
          console.log(`Bouton Follow détecté sur le profil de ${username}`);
        } catch (error) {
          console.error('Impossible de trouver le bouton Follow sur le profil:', error.message);
          continue;
        }

        // Vérifier si on suit déjà l'utilisateur (bouton 'Following' présent)
        const isFollowing = await page.evaluate((uname) => {
          const btns = Array.from(document.querySelectorAll('button'));
          return btns.some(btn => btn.textContent && btn.textContent.trim() === 'Following');
        }, username);

        if (isFollowing) {
          console.log(`[${username}] Déjà suivi (bouton 'Following' détecté), on passe au suivant`);
          followHistory[userKey] = { date: new Date().toISOString() };
          continue;
        }

        // Essayer de cliquer sur le bouton Follow SANS jamais cliquer sur 'Message'
        try {
          // Vérifie la validité du frame
          try { await page.title(); } catch (e) {
            console.log(`Frame détaché juste avant le clic pour ${username}, on réessaie...`);
            page = await this.ensurePage(true);
            await this.navigateWithRetries(`https://farcaster.xyz/${username}`);
            continue;
          }
          await page.waitForTimeout(500);

          // Recherche du bouton Follow par texte ET classe
          const followBtnSelector = 'button.rounded-lg.font-semibold.border.border-transparent.bg-action-primary.text-light';
          const followBtn = await page.$x(`//button[contains(@class, 'rounded-lg') and contains(@class, 'font-semibold') and contains(@class, 'bg-action-primary') and normalize-space(text())='Follow']`);
          let clickSuccess = false;
          if (followBtn && followBtn.length > 0) {
            await followBtn[0].click();
            clickSuccess = true;
          } else {
            // Fallback : méthode CSS classique
            try {
              await page.click(followBtnSelector);
              clickSuccess = true;
            } catch (err) {
              console.log(`[${username}] Aucun bouton Follow cliquable trouvé (ni XPath ni CSS)`);
            }
          }
          if (clickSuccess) {
            await page.waitForTimeout(2000);
            console.log(`[${username}] Clic sur Follow réussi !`);
            followCount++;
            followHistory[userKey] = { date: new Date().toISOString() };
            SocialActions.saveFollowHistory(followHistory);
            await page.waitForTimeout(5000);
          } else {
            console.log(`[${username}] Bouton Follow non trouvé ou non cliquable, on passe au suivant`);
            continue;
          }
        } catch (error) {
          console.error(`[${username}] Erreur lors du clic sur Follow:`, error.message);
        }
      }

      // Retourner le nombre d'utilisateurs suivis avec succès
      return followCount;

    } catch (error) {
      console.error('Erreur lors de la recherche et follow d\'utilisateurs:', error);
      return followCount;
    }
  }

  /**
   * Parcourt le fil d'accueil (home) Farcaster et répond automatiquement aux messages pertinents.
   * @param {Function} generateResponse - Fonction pour générer une réponse (via Gemini)
   * @param {number} maxResponses - Nombre maximum de réponses à envoyer
   * @param {Array<string>} [replyKeywords] - Liste optionnelle de mots-clés pour filtrer les messages avant de répondre
   * @returns {Promise<number>} - Nombre de réponses envoyées
   */
  async replyOnHomeTimeline(generateResponse, maxResponses = 3, replyKeywords = []) {
    const page = await this.ensurePage(true);
    let responsesCount = 0;
    let skippedCount = 0;

    try {
      // Aller sur le fil d'accueil Farcaster
      const homeUrl = 'https://farcaster.xyz/';
      console.log(`Navigation vers le fil d'accueil: ${homeUrl}`);
      await page.goto(homeUrl, { waitUntil: 'networkidle2', timeout: 45000 });
      await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 5000)));

      // Sélecteur pour trouver tous les messages sur le fil d'accueil
      const messageItems = await page.$$('.relative.cursor-pointer.px-4.py-2, div.cursor-pointer:has(div.line-clamp-feed)');
      console.log(`Trouvé ${messageItems.length} messages potentiels sur le fil d'accueil`);

      // Charger l'historique des réponses
      const replyHistory = SocialActions.loadReplyHistory();
      for (let i = 0; i < messageItems.length && responsesCount < maxResponses; i++) {
        try {
          const messageItem = messageItems[i];
          // Extraire le contenu du message
          const content = await page.evaluate(el => {
            const textElement = el.querySelector('.line-clamp-feed');
            return textElement ? textElement.textContent.trim() : '';
          }, messageItem);
          // Calculer les 10 premiers mots
          const first10 = SocialActions.getFirst10Words(content);
          // Extraire l'auteur
          const author = await page.evaluate(el => {
            const authorElement =
              el.querySelector('span a.font-semibold') ||
              el.querySelector('div.font-semibold') ||
              el.querySelector('a[href^="/"]:not([href*="/~/"])');
            const authorName = authorElement ? authorElement.textContent.trim() : '';
            return authorName || 'utilisateur_inconnu';
          }, messageItem);
          if (!content) {
            console.log('Message sans contenu, passage au suivant');
            continue;
          }
          console.log(`Message ${i + 1}/${messageItems.length} par ${author}: ${content.substring(0, 30)}...`);
          // Filtrage par mots-clés
          if (replyKeywords.length > 0) {
            const hasReplyKeyword = replyKeywords.some(kw => content.toLowerCase().includes(kw.toLowerCase()));
            if (!hasReplyKeyword) {
              console.log('Aucun mot-clé de réponse trouvé dans le message, passage au suivant');
              skippedCount++;
              continue;
            }
          }
          // Vérifier historique
          if (replyHistory[first10]) {
            console.log('Déjà répondu à ce message (10 premiers mots identiques), passage au suivant');
            skippedCount++;
            continue;
          }
          if (SocialActions.hasRespondedToAuthorRecently(replyHistory, author)) {
            console.log(`Déjà répondu à l'auteur "${author}" récemment, passage au suivant`);
            skippedCount++;
            continue;
          }
          // Générer une réponse
          console.log('Génération d\'une réponse avec Gemini...');
          const response = await generateResponse(content, author);
          if (!response) {
            console.log('Pas de réponse générée, passage au suivant');
            continue;
          }
          // Cliquer sur le bouton de réponse
          let replyButton = await messageItem.$('div.group.flex.w-max.flex-row.items-center.text-sm.text-faint.cursor-pointer');
          if (!replyButton) {
            replyButton = await messageItem.$('div:has(svg path[d^="M1.625 3.09375"][fill="#9FA3AF"])');
          }
          if (!replyButton) {
            replyButton = await messageItem.$('.group.flex:has(svg path[fill="#9FA3AF"])');
          }
          if (!replyButton) {
            try {
              const allButtons = await messageItem.$$('div.group.flex');
              for (const button of allButtons) {
                const hasCommentIcon = await button.evaluate(el => {
                  const svgPath = el.querySelector('svg path');
                  return svgPath && svgPath.getAttribute('d') && svgPath.getAttribute('d').startsWith('M1.625 3.09375');
                });
                if (hasCommentIcon) {
                  replyButton = button;
                  break;
                }
              }
            } catch (error) {
              console.error('Erreur lors de la recherche du bouton de réponse:', error.message);
            }
          }
          if (!replyButton) {
            console.log('Bouton de réponse introuvable après toutes les stratégies, passage au message suivant');
            continue;
          }
          console.log('Bouton de réponse trouvé !');
          // Clic sur le bouton de réponse
          try {
            await replyButton.click();
          } catch (clickError) {
            console.error('Erreur lors du clic sur le bouton de réponse:', clickError.message);
            continue;
          }
          await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 5000)));
          // Vérifier si la modale est ouverte
          const modalVisible = await page.evaluate(() => {
            return !!document.querySelector('div[role="textbox"], [contenteditable="true"], textarea');
          });
          if (!modalVisible) {
            console.log('La modale de réponse ne s\'est pas ouverte correctement, on passe au message suivant');
            continue;
          }
          try {
            await page.waitForSelector('div[role="textbox"], [contenteditable="true"], textarea', { visible: true, timeout: 45000 });
          } catch (selectorError) {
            console.error('Erreur lors de l\'attente du champ de texte:', selectorError.message);
            continue;
          }
          console.log('Saisie de la réponse...');
          await page.type('div[role="textbox"], [contenteditable="true"], textarea', response);
          // Cliquer sur le bouton d'envoi
          const exactSelector = 'button.rounded-lg.font-semibold.border.border-transparent.bg-action-primary.text-light[title="Reply"]';
          await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 1000)));
          try {
            let sendButton = await page.$(exactSelector);
            if (!sendButton) {
              sendButton = await page.$('button.rounded-lg.font-semibold[title="Reply"]');
            }
            if (!sendButton) {
              sendButton = await page.$('button.bg-action-primary.text-light');
            }
            if (!sendButton) {
              const buttons = await page.$$('button');
              for (const btn of buttons) {
                const text = await page.evaluate(el => el.textContent?.trim(), btn);
                if (text === 'Reply') {
                  sendButton = btn;
                  break;
                }
              }
            }
            if (!sendButton) {
              await page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button'));
                const replyButton = buttons.find(btn => btn.textContent?.trim() === 'Reply');
                if (replyButton) {
                  replyButton.click();
                  return true;
                }
                return false;
              });
            } else {
              await sendButton.click();
              await page.evaluate(element => { element.click(); }, sendButton);
              await page.evaluate(element => {
                const event = new MouseEvent('click', { bubbles: true, cancelable: true, view: window });
                element.dispatchEvent(event);
              }, sendButton);
            }
          } catch (error) {
            console.error('Erreur lors du clic sur le bouton d\'envoi:', error.message);
            await page.keyboard.press('Escape');
            await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 2000)));
            continue;
          }
          await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 3000)));
          console.log('Réponse envoyée avec succès!');
          responsesCount++;
          // Enregistrer dans l'historique
          replyHistory[first10] = {
            author,
            date: new Date().toISOString(),
            responded: true
          };
          SocialActions.saveReplyHistory(replyHistory);
          await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 5000)));
        } catch (error) {
          console.error(`Erreur lors du traitement du message ${i + 1}:`, error);
          await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 3000)));
        }
      }
      console.log(`Traitement terminé. Résultats: ${responsesCount} réponses envoyées, ${skippedCount} messages ignorés.`);
      // Health check : vérifier que la page n'est pas blanche
      try {
        const page = await this.ensurePage();
        // Vérifie qu'un élément clé du DOM Farcaster est présent (ex: sidebar, feed, nav, header)
        const isHealthy = await page.evaluate(() => !!document.querySelector('.bg-sidebar, .line-clamp-feed, nav, header'));
        if (!isHealthy) {
          console.warn('Page blanche détectée, tentative de reload...');
          try {
            await page.reload({ waitUntil: 'networkidle2', timeout: 45000 });
          } catch (reloadErr) {
            console.warn('Reload échoué, recréation de la page Puppeteer...');
            try { await page.close(); } catch { }
            this.page = await getFarcasterPage();
          }
        }
      } catch (healthErr) {
        console.warn('Erreur lors du health check, tentative de recréation de la page...');
        try { if (this.page) await this.page.close(); } catch { }
        this.page = await getFarcasterPage();
      }
      return responsesCount;
    } catch (error) {
      console.error('Erreur lors du parcours du fil d\'accueil et des réponses:', error);
      return responsesCount;
    }
  }
}

export default new SocialActions();
