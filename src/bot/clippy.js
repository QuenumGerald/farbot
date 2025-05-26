const gemini = require('../services/gemini');
const neynar = require('../services/neynar');
const config = require('../config');
const logger = require('../config/logger').child({ module: 'clippy' });

/**
 * Classe principale du bot Clippy
 */
class ClippyBot {
  constructor() {
    this.geminiService = gemini;
    this.neynarService = neynar;
    this.lastProcessedMentionTime = null;
    
    logger.info('ClippyBot initialisé', {
      handle: config.bot.handle,
      displayName: config.bot.displayName
    });
  }

  /**
   * Recherche les casts contenant des mots-clés spécifiques et y répond
   * @param {string|Array<string>} keywords - Mot(s)-clé(s) à rechercher
   * @param {number} limit - Nombre maximum de casts à récupérer
   * @returns {Promise<number>} Nombre de casts traités
   */
  async searchAndRespondToKeywords(keywords = [], limit = 20) {
    try {
      // Convertir keywords en tableau s'il s'agit d'une chaîne
      const keywordArray = Array.isArray(keywords) ? keywords : [keywords];
      
      if (keywordArray.length === 0) {
        logger.warn('Aucun mot-clé spécifié pour la recherche');
        return 0;
      }
      
      logger.info(`Recherche de casts contenant les mots-clés: ${keywordArray.join(', ')}`);
      
      // Récupérer les casts récents (recherche générale)
      const recentCasts = await this._searchRecentCasts(limit);
      
      if (!recentCasts || recentCasts.length === 0) {
        logger.debug('Aucun cast récent trouvé');
        return 0;
      }
      
      logger.debug(`${recentCasts.length} casts récupérés, filtrage par mots-clés...`);
      
      // Filtrer les casts qui contiennent les mots-clés
      const matchingCasts = this._filterCastsByKeywords(recentCasts, keywordArray);
      
      if (matchingCasts.length === 0) {
        logger.debug('Aucun cast ne contient les mots-clés spécifiés');
        return 0;
      }
      
      // Filtrer les casts déjà traités
      const newCasts = this._filterAlreadyProcessedCasts(matchingCasts);
      
      if (newCasts.length === 0) {
        logger.debug('Tous les casts correspondants ont déjà été traités');
        return 0;
      }
      
      logger.info(`${newCasts.length} nouveau(x) cast(s) à traiter`);
      
      // Traiter chaque cast correspondant
      for (const cast of newCasts) {
        await this._respondToCast(cast, keywordArray);
      }
      
      // Mettre à jour la liste des casts traités
      if (newCasts.length > 0) {
        this.lastProcessedCastTime = new Date().toISOString();
      }
      
      return newCasts.length;
    } catch (error) {
      logger.error('Erreur lors de la recherche et réponse aux mots-clés:', error);
      return 0;
    }
  }
  
  /**
   * Recherche les casts récents sur Farcaster
   * @param {number} limit - Nombre maximum de casts à récupérer
   * @returns {Promise<Array>} Liste des casts récents
   * @private
   */
  async _searchRecentCasts(limit = 20) {
    try {
      // Note: Cette méthode devrait être implémentée dans le service Neynar
      // Pour l'instant, nous simulons une recherche de base avec une autre méthode
      
      // Remplacer par une méthode appropriée pour récupérer les casts récents
      // Dans l'implémentation finale, cela pourrait être:
      // const casts = await this.neynarService.searchRecentCasts(limit);
      
      // Pour le moment, utilisons l'API de recherche alternative
      const response = await this.neynarService.client.searchRecentCasts({limit});
      return response.casts || [];
    } catch (error) {
      logger.error('Erreur lors de la recherche des casts récents:', error);
      return [];
    }
  }
  
  /**
   * Filtre les casts qui contiennent les mots-clés spécifiés
   * @param {Array} casts - Liste des casts à filtrer
   * @param {Array<string>} keywords - Liste des mots-clés
   * @returns {Array} Casts contenant au moins un des mots-clés
   * @private
   */
  _filterCastsByKeywords(casts, keywords) {
    if (!casts || !Array.isArray(casts) || casts.length === 0) {
      return [];
    }
    
    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return [];
    }
    
    // Convertir les mots-clés en minuscules pour une recherche insensible à la casse
    const lowerKeywords = keywords.map(k => k.toLowerCase());
    
    return casts.filter(cast => {
      if (!cast.text) return false;
      
      const text = cast.text.toLowerCase();
      return lowerKeywords.some(keyword => text.includes(keyword));
    });
  }
  
  /**
   * Filtre les casts déjà traités pour éviter les doublons
   * @param {Array} casts - Liste des casts à filtrer
   * @returns {Array} Nouveaux casts non traités
   * @private
   */
  _filterAlreadyProcessedCasts(casts) {
    if (!casts || !Array.isArray(casts) || casts.length === 0) {
      return [];
    }
    
    // Si c'est la première fois, on initialise l'historique
    if (!this.processedCastHashes) {
      this.processedCastHashes = new Set();
    }
    
    // Filtrer les casts déjà traités
    const newCasts = casts.filter(cast => {
      return cast.hash && !this.processedCastHashes.has(cast.hash);
    });
    
    // Ajouter les nouveaux casts à l'historique
    newCasts.forEach(cast => {
      if (cast.hash) {
        this.processedCastHashes.add(cast.hash);
      }
    });
    
    return newCasts;
  }
  
  /**
   * Répond à un cast spécifique en fonction des mots-clés trouvés
   * @param {Object} cast - Le cast auquel répondre
   * @param {Array<string>} keywords - Les mots-clés trouvés
   * @returns {Promise<boolean>} Succès de l'opération
   * @private
   */
  async _respondToCast(cast, keywords) {
    try {
      if (!cast || !cast.author) {
        return false;
      }
      
      const author = cast.author;
      const text = cast.text || '';
      
      logger.info(`Réponse au cast de ${author.username}`, {
        castHash: cast.hash,
        text: text.substring(0, 50) + (text.length > 50 ? '...' : '')
      });
      
      // Créer un prompt pour générer une réponse contextuelle
      const keywordsText = Array.isArray(keywords) ? keywords.join(', ') : keywords;
      const prompt = `Ce cast parle de: ${keywordsText}. Génère une réponse à: "${text}"`;
      
      // Générer une réponse avec Gemini
      const response = await this.geminiService.generateResponse(prompt, {
        author: author.username
      });
      
      // Publier la réponse
      if (response) {
        await this.neynarService.replyToCast(response, cast.hash);
        logger.info(`Réponse envoyée à ${author.username}`); 
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error('Erreur lors de la réponse au cast:', error);
      return false;
    }
  }
  
  /**
   * Publie un contenu généré automatiquement adapté au moment de la journée
   * @param {Object} options - Options de personnalisation
   * @param {string} options.theme - Thème spécifique pour cette publication
   * @param {boolean} options.withImage - Si true, inclut une image générée
   * @param {string} options.contentType - Type de contenu ('text', 'image', 'mixed')
   * @returns {Promise<object>} Le cast publié
   */
  async publishDailyContent(options = {}) {
    try {
      const contentType = options.contentType || 'mixed';
      const withImage = options.withImage !== undefined ? options.withImage : true;
      
      logger.info('Génération de contenu pour publication...', {
        contentType,
        withImage,
        theme: options.theme || 'auto'
      });
      
      // Obtenir l'heure actuelle pour adapter le contenu
      const now = new Date();
      const hour = now.getHours();
      const dateStr = now.toLocaleDateString('fr-FR', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      const timeStr = now.toLocaleTimeString('fr-FR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      
      // Déterminer le type de contenu selon l'heure de la journée ou le thème spécifié
      let theme, promptBase, emoji, imagePromptBase;
      
      if (options.theme) {
        // Utiliser le thème fourni en paramètre
        theme = options.theme;
        
        // Assigner l'emoji en fonction du thème
        if (theme.includes('actualité')) {
          emoji = '☕'; // ☕ (café)
        } else if (theme.includes('tendance') || theme.includes('analyse')) {
          emoji = '📈'; // 📈 (graphique)
        } else if (theme.includes('conseil') || theme.includes('technique')) {
          emoji = '💡'; // 💡 (ampoule)
        } else if (theme.includes('discussion') || theme.includes('communaut')) {
          emoji = '👥'; // 👥 (personnes)
        } else if (theme.includes('réflexion') || theme.includes('philosophie')) {
          emoji = '🌙'; // 🌙 (lune)
        } else if (theme.includes('illustration') || theme.includes('image')) {
          emoji = '🎨'; // 🎨 (palette)
        } else {
          emoji = '💻'; // 💻 (ordinateur)
        }
      } else if (hour >= 6 && hour < 10) {
        // Matin: actualités et perspectives de la journée
        theme = 'actualités matinales';
        emoji = '☕'; // ☕ (café)
        promptBase = `Résume les principales actualités crypto et Web3 de ce matin.`;
        imagePromptBase = 'Un lever de soleil sur une ville futuriste avec des éléments blockchain';
      } else if (hour >= 10 && hour < 14) {
        // Mi-journée: analyse de tendances
        theme = 'analyse de tendances';
        emoji = '📈'; // 📈 (graphique)
        promptBase = `Analyse une tendance Web3 ou crypto importante aujourd'hui.`;
        imagePromptBase = 'Un graphique abstrait montrant une tendance haussière avec des éléments de blockchain';
      } else if (hour >= 14 && hour < 18) {
        // Après-midi: tutoriel ou conseil technique
        theme = 'conseil technique';
        emoji = '💡'; // 💡 (ampoule)
        promptBase = `Donne un conseil pratique lié à la crypto ou au Web3.`;
        imagePromptBase = 'Une visualisation de concept technique Web3 avec interface utilisateur futuriste';
      } else if (hour >= 18 && hour < 22) {
        // Soirée: discussion communautaire
        theme = 'discussion communautaire';
        emoji = '👥'; // 👥 (personnes)
        promptBase = `Pose une question stimulante sur l'avenir du Web3 pour engager la communauté.`;
        imagePromptBase = 'Une réunion virtuelle de personnes discutant autour d\'une table holographique';
      } else {
        // Nuit: innovations ou réflexions philosophiques
        theme = 'réflexion nocturne';
        emoji = '🌙'; // 🌙 (lune)
        promptBase = `Partage une réflexion philosophique sur l'avenir de la technologie décentralisée.`;
        imagePromptBase = 'Un ciel nocturne étoilé avec des constellations formant des symboles blockchain';
      }
      
      // Adapter le prompt en fonction du type de contenu
      if (!promptBase) {
        switch (theme) {
          case 'actualités':
          case 'actualités matinales':
            promptBase = `Résume les principales actualités crypto et Web3 du moment.`;
            imagePromptBase = 'Un lever de soleil sur une ville futuriste avec des éléments blockchain';
            break;
          case 'tendances':
          case 'analyse de tendances':
            promptBase = `Analyse une tendance Web3 ou crypto importante en ce moment.`;
            imagePromptBase = 'Un graphique abstrait montrant une tendance avec des éléments blockchain';
            break;
          case 'conseils':
          case 'conseil technique':
            promptBase = `Donne un conseil pratique lié à la crypto ou au Web3.`;
            imagePromptBase = 'Une visualisation de concept technique Web3 futuriste';
            break;
          case 'discussion':
          case 'discussion communautaire':
            promptBase = `Pose une question stimulante sur l'avenir du Web3 pour engager la communauté.`;
            imagePromptBase = 'Une réunion virtuelle de personnes discutant de blockchain';
            break;
          case 'réflexion':
          case 'réflexion nocturne':
            promptBase = `Partage une réflexion philosophique sur l'avenir de la technologie décentralisée.`;
            imagePromptBase = 'Un ciel nocturne étoilé avec des constellations blockchain';
            break;
          case 'illustration':
            promptBase = `Décris brièvement cette illustration sur un concept Web3 innovant.`;
            imagePromptBase = 'Une illustration futuriste de concept Web3 avec des éléments visuels frappants';
            break;
          default:
            promptBase = `Partage une information intéressante sur la blockchain ou le Web3.`;
            imagePromptBase = 'Une illustration abstraite de concept blockchain';
        }
      }
      
      // Générer un prompt complet pour le contenu
      let prompt;
      if (contentType === 'image') {
        prompt = `Décris brièvement cette illustration sur ${theme} dans l'univers blockchain/Web3. Inclus un titre accrocheur.`;
      } else {
        prompt = `${promptBase}\n\nGénère un message engageant sur ce sujet pour Farcaster.\nLe message doit être informatif, intéressant et avoir un ton conversationnel.\nIncorpore des faits actuels si pertinent.\nLimite à 250 caractères maximum.`;
      }
      
      // Générer le contenu avec Gemini
      logger.debug('Génération du contenu textuel via Gemini...');
      const content = await this.geminiService.generateResponse(prompt);
      
      // Générer une image si nécessaire
      let imageUrl = null;
      if (withImage || contentType === 'image') {
        try {
          logger.debug('Génération de l\'image via Gemini...');
          const imagePrompt = imagePromptBase || `Une illustration moderne conceptuelle sur ${theme} dans l'univers blockchain et Web3, style digital art, haute qualité.`;
          imageUrl = await this.geminiService.generateImage(imagePrompt);
          logger.debug('Image générée avec succès', { imageUrl: imageUrl ? '[URL disponible]' : 'null' });
        } catch (imageError) {
          logger.warn('Erreur lors de la génération de l\'image:', imageError);
          // Continuer sans image
        }
      }
      
      // Construire le texte du cast
      let text = `${emoji} ${theme.charAt(0).toUpperCase() + theme.slice(1)} | ${timeStr}\n\n${content}`;
      
      // Ajouter hashtags pertinents
      const hashtags = ['#crypto', '#web3', '#farcaster'];
      // Ajouter un hashtag spécifique au type de contenu
      hashtags.push(`#${theme.replace(/\s+/g, '')}`);
      
      // Ajouter les hashtags au texte
      text += `\n\n${hashtags.join(' ')}`;
      
      // Raccourcir si nécessaire pour respecter la limite de 280 caractères
      if (text.length > 280) {
        // Garder le début et retirer du contenu du milieu pour ajouter les hashtags
        const prefixLength = text.indexOf('\n\n') + 2;
        const prefix = text.substring(0, prefixLength);
        const hashtagsText = `\n\n${hashtags.join(' ')}`;
        const availableLength = 277 - prefix.length - hashtagsText.length;
        const truncatedContent = content.substring(0, availableLength);
        text = prefix + truncatedContent + '...' + hashtagsText;
      }
      
      // Publier le cast
      logger.info('Publication du cast...');
      const cast = await this.neynarService.publishCast(text, {
        embeds: imageUrl ? [{ url: imageUrl }] : undefined,
      });
      
      logger.info(`Publication de ${theme} réussie`, { 
        castHash: cast.hash,
        type: contentType,
        theme,
        hasImage: !!imageUrl,
        time: timeStr 
      });
      
      return cast;
    } catch (error) {
      logger.error('Erreur lors de la publication du contenu:', error);
      throw error;
    }
  }
  
  /**
   * Like automatiquement des casts récents contenant certains mots-clés
   * @param {number} limit - Nombre maximum de casts à liker
   * @param {Array<string>} keywords - Mots-clés pour filtrer les casts à liker
   * @returns {Promise<number>} Nombre de casts likés
   */
  async likeRecentCasts(limit = 10, keywords = []) {
    try {
      // Récupérer les casts récents
      logger.info(`Recherche de casts récents pour like automatique, limite: ${limit}`);
      const recentCasts = await this._searchRecentCasts(limit * 2); // On récupère plus pour avoir assez après filtrage
      
      if (!recentCasts || recentCasts.length === 0) {
        logger.debug('Aucun cast récent trouvé pour like automatique');
        return 0;
      }
      
      // Filtrer par mots-clés si spécifiés
      let castsToLike = recentCasts;
      if (keywords && keywords.length > 0) {
        castsToLike = this._filterCastsByKeywords(recentCasts, keywords);
      }
      
      // Limiter au nombre spécifié
      castsToLike = castsToLike.slice(0, limit);
      
      if (castsToLike.length === 0) {
        logger.debug('Aucun cast ne correspond aux critères pour like automatique');
        return 0;
      }
      
      // Liker chaque cast
      let likedCount = 0;
      for (const cast of castsToLike) {
        try {
          // Vérifier si on a déjà liké ce cast
          const isAlreadyLiked = await this.neynarService.checkIfLiked(cast.hash);
          
          if (!isAlreadyLiked) {
            await this.neynarService.likeCast(cast.hash);
            likedCount++;
            logger.debug(`Cast liké avec succès: ${cast.hash}`, { author: cast.author.username });
            
            // Pause pour éviter le rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));
          } else {
            logger.debug(`Cast déjà liké, ignoré: ${cast.hash}`);
          }
        } catch (error) {
          logger.warn(`Erreur lors du like du cast ${cast.hash}:`, error);
          // Continuer avec le prochain cast
        }
      }
      
      logger.info(`${likedCount}/${castsToLike.length} casts likés avec succès`);
      return likedCount;
    } catch (error) {
      logger.error('Erreur lors du like automatique des casts:', error);
      return 0;
    }
  }
  
  /**
   * Suit automatiquement des utilisateurs pertinents dans l'écosystème
   * @param {number} limit - Nombre maximum d'utilisateurs à suivre
   * @returns {Promise<number>} Nombre d'utilisateurs suivis
   */
  async followRelevantUsers(limit = 5) {
    try {
      logger.info(`Recherche d'utilisateurs pertinents à suivre, limite: ${limit}`);
      
      // Rechercher des utilisateurs actifs récemment sur des sujets pertinents
      // On utilise les casts récents contenant des mots-clés pour trouver des auteurs intéressants
      const relevantKeywords = ['web3', 'blockchain', 'crypto', 'farcaster', 'frame'];
      const recentCasts = await this._searchRecentCasts(50); // Un échantillon plus large
      
      // Filtrer pour trouver des casts sur des sujets pertinents
      const relevantCasts = this._filterCastsByKeywords(recentCasts, relevantKeywords);
      
      if (relevantCasts.length === 0) {
        logger.debug('Aucun cast pertinent trouvé pour trouver des utilisateurs à suivre');
        return 0;
      }
      
      // Extraire les auteurs uniques
      const potentialUsersToFollow = new Map();
      
      for (const cast of relevantCasts) {
        // Score de base pour l'activité
        let score = 1;
        
        // Augmenter le score si le cast a beaucoup d'engagement
        if (cast.reactions?.count > 10) score += 1;
        if (cast.replies?.count > 5) score += 1;
        if (cast.recasts?.count > 3) score += 1;
        
        // Stocker l'utilisateur avec son score
        const userId = cast.author.fid;
        potentialUsersToFollow.set(userId, {
          fid: userId,
          username: cast.author.username,
          displayName: cast.author.displayName,
          score: (potentialUsersToFollow.get(userId)?.score || 0) + score
        });
      }
      
      // Trier les utilisateurs par score et prendre les meilleurs
      const sortedUsers = Array.from(potentialUsersToFollow.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, limit * 2); // On prend plus pour pouvoir filtrer les déjà suivis
      
      // Suivre les utilisateurs qui ne sont pas déjà suivis
      let followedCount = 0;
      for (const user of sortedUsers) {
        if (followedCount >= limit) break;
        
        try {
          // Vérifier si on suit déjà cet utilisateur
          const isFollowing = await this.neynarService.checkIfFollowing(user.fid);
          
          if (!isFollowing) {
            await this.neynarService.followUser(user.fid);
            followedCount++;
            logger.debug(`Utilisateur suivi avec succès: @${user.username}`, { fid: user.fid, score: user.score });
            
            // Pause pour éviter le rate limiting
            await new Promise(resolve => setTimeout(resolve, 2000));
          } else {
            logger.debug(`Utilisateur déjà suivi, ignoré: @${user.username}`);
          }
        } catch (error) {
          logger.warn(`Erreur lors du suivi de l'utilisateur ${user.username}:`, error);
          // Continuer avec le prochain utilisateur
        }
      }
      
      logger.info(`${followedCount} nouveaux utilisateurs suivis avec succès`);
      return followedCount;
    } catch (error) {
      logger.error('Erreur lors du suivi automatique d\'utilisateurs:', error);
      return 0;
    }
  }
  
  /**
   * Traite une mention spécifique
   * @param {Object} mention La mention à traiter
   * @private
   */
  async _processMention(mention) {
    try {
      if (!mention || !mention.cast) {
        logger.warn('Mention invalide reçue', { mention });
        return;
      }
      
      const { cast } = mention;
      const author = cast.author;
      
      logger.info(`Traitement de la mention de ${author.username}`, {
        castHash: cast.hash,
        text: cast.text.substring(0, 50) + (cast.text.length > 50 ? '...' : '')
      });
      
      // Extraire le texte de la mention sans le handle du bot
      const prompt = this._extractPromptFromMention(cast.text);
      
      // Vérifier si c'est une commande spéciale
      if (prompt.startsWith('/')) {
        await this._handleCommand(prompt, cast, author);
      } else {
        // Générer une réponse avec Gemini
        await this._generateAndReply(prompt, cast, author);
      }
    } catch (error) {
      logger.error('Erreur lors du traitement de la mention:', error);
    }
  }
  
  /**
   * Extrait le prompt de la mention en retirant le handle du bot
   * @param {string} text Texte complet de la mention
   * @returns {string} Prompt nettoyé
   * @private
   */
  _extractPromptFromMention(text) {
    if (!text) return '';
    
    // Retirer le handle du bot (avec ou sans @)
    const botHandle = config.bot.handle.startsWith('@') 
      ? config.bot.handle 
      : '@' + config.bot.handle;
    
    let prompt = text.replace(new RegExp(botHandle, 'gi'), '').trim();
    
    // Nettoyer les espaces multiples
    prompt = prompt.replace(/\s+/g, ' ').trim();
    
    return prompt;
  }
  
  /**
   * Gère les commandes spéciales
   * @param {string} command La commande (commence par /)
   * @param {Object} cast Le cast contenant la commande
   * @param {Object} author L'auteur du cast
   * @private
   */
  async _handleCommand(command, cast, author) {
    const cmd = command.split(' ')[0].toLowerCase();
    const params = command.substring(cmd.length).trim();
    
    logger.debug(`Commande reçue: ${cmd}`, { params });
    
    switch (cmd) {
      case '/help':
        await this._sendHelpResponse(cast);
        break;
        
      case '/follow':
        await this._followUser(params || author.fid, cast);
        break;
        
      case '/joke':
        await this._generateAndReply('Raconte une blague courte et drôle sur la crypto ou la tech', cast, author);
        break;
        
      default:
        await this.neynarService.replyToCast(
          `Désolé, je ne reconnais pas cette commande. Essayez /help pour voir les commandes disponibles.`,
          cast.hash
        );
    }
  }
  
  /**
   * Envoie un message d'aide en réponse à la commande /help
   * @param {Object} cast Le cast contenant la commande
   * @private
   */
  async _sendHelpResponse(cast) {
    const helpText = `🤖 Commandes disponibles:
/help - Affiche ce message
/follow - Me fait vous suivre
/joke - Je vous raconte une blague

Vous pouvez aussi simplement me mentionner avec une question ou une demande!`;

    await this.neynarService.replyToCast(helpText, cast.hash);
  }
  
  /**
   * Suit un utilisateur en réponse à la commande /follow
   * @param {string|number} targetFid FID de l'utilisateur à suivre
   * @param {Object} cast Le cast contenant la commande
   * @private
   */
  async _followUser(targetFid, cast) {
    try {
      await this.neynarService.followUser(targetFid);
      await this.neynarService.replyToCast('Je vous suis maintenant! 👋', cast.hash);
    } catch (error) {
      logger.error('Erreur lors du suivi de l\'utilisateur:', error);
      await this.neynarService.replyToCast('Désolé, je n\'ai pas pu vous suivre. Veuillez réessayer plus tard.', cast.hash);
    }
  }
  
  /**
   * Génère une réponse avec Gemini et répond au cast
   * @param {string} prompt Le prompt pour Gemini
   * @param {Object} cast Le cast à répondre
   * @param {Object} author L'auteur du cast
   * @private
   */
  async _generateAndReply(prompt, cast, author) {
    try {
      // Contexte pour Gemini
      const context = `L'utilisateur s'appelle ${author.displayName || author.username} (@${author.username}).
Son message: "${cast.text}"`;
      
      // Générer la réponse
      let response = await this.geminiService.generateResponse(prompt, context);
      
      // Limiter la réponse à 280 caractères
      if (response.length > 280) {
        response = response.substring(0, 277) + '...';
      }
      
      // Répondre au cast
      await this.neynarService.replyToCast(response, cast.hash);
      
      logger.info('Réponse envoyée avec succès', { 
        to: author.username,
        responseLength: response.length 
      });
    } catch (error) {
      logger.error('Erreur lors de la génération/envoi de la réponse:', error);
      
      // Réponse de secours en cas d'erreur
      try {
        await this.neynarService.replyToCast(
          "Désolé, je rencontre des difficultés à traiter votre demande actuellement. Veuillez réessayer plus tard.",
          cast.hash
        );
      } catch (replyError) {
        logger.error('Erreur lors de l\'envoi de la réponse de secours:', replyError);
      }
    }
  }
  
  /**
   * Filtre les mentions pour ne garder que les nouvelles
   * @param {Array} mentions Liste de toutes les mentions
   * @returns {Array} Liste des nouvelles mentions
   * @private
   */
  _filterNewMentions(mentions) {
    if (!this.lastProcessedMentionTime) {
      // Premier lancement, on considère toutes les mentions comme nouvelles
      // mais on limite à 5 pour ne pas spammer
      logger.debug('Premier lancement, traitement limité à 5 mentions');
      return mentions.slice(0, 5);
    }
    
    const lastTime = new Date(this.lastProcessedMentionTime);
    
    return mentions.filter(mention => {
      const mentionTime = new Date(mention.timestamp);
      return mentionTime > lastTime;
    });
  }
}

module.exports = ClippyBot;
