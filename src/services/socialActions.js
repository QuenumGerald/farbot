import { getFarcasterPage } from './login.js';
import fs from 'fs';
import path from 'path';

class SocialActions {
  constructor() {
    this.page = null;
  }

  /**
   * Initialise la page si ce n'est pas déjà fait
   */
  async ensurePage() {
    if (!this.page) {
      this.page = await getFarcasterPage();
    }
    return this.page;
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
        timeout: 5000
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
      await page.waitForSelector('div[role="textbox"], [contenteditable="true"], textarea', { visible: true, timeout: 10000 });

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
      await this.page.close();
      this.page = null;
    }
  }
  
  /**
   * Recherche des messages et y répond directement sur la page de recherche
   * @param {string} keyword - Mot-clé à rechercher
   * @param {string} type - Type de recherche ('users' ou 'recent')
   * @param {Function} generateResponse - Fonction pour générer une réponse (via Gemini)
   * @param {number} maxResponses - Nombre maximum de réponses à envoyer
   * @returns {Promise<number>} - Nombre de réponses envoyées
   */
  async searchAndReplyInline(keyword, type = 'recent', generateResponse, maxResponses = 3) {
    // --- Gestion de l'historique des réponses ---
    const historyPath = path.resolve(process.cwd(), 'reply_history.json');
    let replyHistory = {};
    try {
      if (fs.existsSync(historyPath)) {
        replyHistory = JSON.parse(fs.readFileSync(historyPath, 'utf-8'));
      }
    } catch (err) {
      console.warn('Impossible de charger reply_history.json:', err.message);
    }

    const page = await this.ensurePage();
    let responsesCount = 0;
    
    try {
      // Utilise l'URL adaptée selon le type de recherche
      const searchUrl = `https://farcaster.xyz/~/search/${type}?q=${encodeURIComponent(keyword)}`;
      console.log(`Recherche en cours sur: ${searchUrl}`);
      
      await page.goto(searchUrl, {
        waitUntil: 'networkidle2',
        timeout: 10000
      });
      
      // Attendre que la page charge complètement
      await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 5000)));
      
      // Trouver tous les messages sur la page de recherche
      console.log('Recherche des messages sur la page...');
      const messageItems = await page.$$('.relative.cursor-pointer.px-4.py-2, div.cursor-pointer:has(div.line-clamp-feed)');
      console.log(`Trouvé ${messageItems.length} messages potentiels`);
      
      // Parcourir chaque message et répondre
      for (let i = 0; i < Math.min(messageItems.length, maxResponses); i++) {
        try {
          const messageItem = messageItems[i];
          let replyButton = null;
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

        console.log(`Réponse générée: ${response.substring(0, 30)}...`);

        // Cliquer sur le bouton de réponse
        console.log('Clic sur le bouton de réponse...');
        await replyButton.click();

        // Attendre l'ouverture de la modale
        await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 3000)));

        // Saisir la réponse
        await page.waitForSelector('div[role="textbox"], [contenteditable="true"], textarea', { visible: true, timeout: 10000 });
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

        responsesCount++;
      } catch (error) {
        console.error('Erreur lors de la réponse à un message:', error.message);
      }
    }
    return responsesCount;
  } catch (error) {
    console.error('Erreur lors de la recherche et réponse aux messages:', error);
    return responsesCount;
  }
} 
