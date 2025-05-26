# Clippy - Bot Farcaster

Un bot intelligent pour la communauté Farcaster qui interagit avec les utilisateurs et publie du contenu de manière autonome, propulsé par Google Gemini et l'API Neynar.

## 🚀 Fonctionnalités

- 🤖 **Réponses intelligentes** via Google Gemini (modèle gemini-2.0-flash-lite)
- 📅 **Publication automatisée** de contenu (texte + images générées)
- ❤️ **Interactions sociales** (follow/unfollow, like/unlike)
- ⏱️ **Planification des tâches** avec BlazerJob (SQLite)
- 🔐 **Authentification sécurisée** via Neynar (Protobuf + JWT Warpcast)

## 📋 Prérequis

- Node.js 18+ (LTS recommandé)
- Compte Google Cloud avec l'[API Gemini](https://ai.google.dev/) activée
- Clés d'API [Neynar](https://neynar.com/)
- Base de données SQLite (gérée automatiquement)

## 🛠 Installation

1. **Cloner le dépôt**
   ```bash
   git clone https://github.com/QuenumGerald/farbot.git
   cd farbot
   ```

2. **Installer les dépendances**
   ```bash
   npm install
   ```

3. **Configurer l'environnement**
   ```bash
   cp .env.example .env
   ```
   
   Puis éditez le fichier `.env` avec vos clés d'API :
   ```env
   # Google Gemini
   GOOGLE_API_KEY=votre_cle_api_gemini
   
   # Neynar
   NEYNAR_API_KEY=votre_cle_api_neynar
   NEYNAR_SIGNER_UUID=votre_signer_uuid
   
   # Configuration du bot
   BOT_HANDLE=@votrebot
   BOT_DISPLAY_NAME=MonBot
   BIO="🤖 Bot assistant Farcaster propulsé par Gemini"
   
   # Base de données
   DATABASE_URL=sqlite:./data/clippy.db
   ```

4. **Démarrer le bot**
   ```bash
   npm start
   ```

   Pour le développement avec rechargement automatique :
   ```bash
   npm run dev
   ```

## 🏗 Structure du projet

```
farbot/
├── src/
│   ├── bot/               # Logique principale du bot
│   │   └── index.js       # Classe principale du bot
│   ├── services/          # Services externes
│   │   ├── gemini.js      # Service Google Gemini
│   │   └── neynar.js      # Service Neynar API
│   ├── jobs/              # Tâches planifiées
│   │   └── scheduler.js   # Planificateur BlazerJob
│   ├── routes/            # Routes API (si nécessaire)
│   ├── utils/             # Utilitaires
│   │   └── logger.js      # Système de journalisation
│   └── index.js           # Point d'entrée de l'application
├── data/                  # Base de données SQLite
├── logs/                  # Fichiers de logs
├── .env.example           # Exemple de configuration
├── .eslintrc.js           # Configuration ESLint
├── .prettierrc            # Configuration Prettier
└── package.json           # Dépendances et scripts
```

## 🔧 Configuration avancée

### Variables d'environnement

| Variable | Description | Exemple |
|----------|-------------|---------|
| `GOOGLE_API_KEY` | Clé API Google Gemini | `AIzaSyD...` |
| `NEYNAR_API_KEY` | Clé API Neynar | `NEYNAR-...` |
| `NEYNAR_SIGNER_UUID` | UUID du signataire Neynar | `...` |
| `BOT_HANDLE` | Identifiant du bot sur Farcaster | `@clippy` |
| `BOT_DISPLAY_NAME` | Nom d'affichage du bot | `Clippy` |
| `BIO` | Description du profil du bot | `🤖 Assistant IA sur Farcaster` |
| `DATABASE_URL` | URL de connexion à la base de données | `sqlite:./data/clippy.db` |

### Tâches planifiées

Le bot exécute automatiquement des tâches planifiées :

- **Publication quotidienne** : Tous les jours à midi (configurable)
- **Vérification des mentions** : Toutes les 5 minutes

Pour modifier la planification, éditez le fichier `src/jobs/scheduler.js`.

## 🤖 Utilisation

### Commandes disponibles

- `npm start` : Démarrer le bot en production
- `npm run dev` : Démarrer en mode développement avec rechargement automatique
- `npm run lint` : Vérifier la qualité du code
- `npm run format` : Formater le code automatiquement

### Personnalisation

1. **Réponses du bot** : Modifiez la méthode `_buildPrompt` dans `src/services/gemini.js` pour personnaliser le comportement du bot.
2. **Publications automatiques** : Adaptez la méthode `publishDailyContent` dans `src/bot/index.js` pour personnaliser le contenu publié.
3. **Interactions sociales** : Personnalisez les méthodes de la classe `ClippyBot` pour modifier le comportement des interactions sociales.

## 🔒 Sécurité

- Ne partagez jamais vos clés API ou informations sensibles
- Utilisez des variables d'environnement pour les informations sensibles
- Limitez les permissions de votre clé API Google aux seules fonctionnalités nécessaires

## 📄 Licence

Ce projet est sous licence [ISC](LICENSE).

## 🙋‍♂️ Support

Pour toute question ou problème, veuillez [ouvrir une issue](https://github.com/QuenumGerald/farbot/issues).

---

Développé avec ❤️ par [Quenum Gerald](https://github.com/QuenumGerald)