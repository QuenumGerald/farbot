# Gestion des Logs et Tâches Planifiées

## Configuration des Logs

Le système de logging utilise Winston avec une configuration personnalisée qui inclut :

- **Niveaux de log** : debug, info, warn, error
- **Sorties** :
  - Console (en développement)
  - Fichiers de logs (tous les environnements)
    - `error.log` : uniquement les erreurs
    - `combined.log` : tous les logs
    - `debug.log` : logs de débogage (uniquement en production)

### Utilisation

```javascript
const logger = require('../config/logger');

// Log simple
logger.info('Message d\'information');
logger.error('Erreur critique', { code: 'ERR_CODE', details: { /* ... */ } });

// Pour un module spécifique
const moduleLogger = logger.module('nom-du-module');
moduleLogger.debug('Message de débogage');

// Avec contexte supplémentaire
logger.warn('Avertissement avec contexte', { userId: 123, action: 'update' });
```

### Configuration

La configuration se trouve dans `src/config/index.js` sous la clé `logging` :

```javascript
logging: {
  level: 'debug', // Niveau de log (error, warn, info, debug)
  directory: './logs', // Répertoire des logs
  files: {
    error: 'error.log',
    combined: 'combined.log',
    debug: 'debug.log'
  },
  maxSize: 10 * 1024 * 1024, // 10 Mo
  maxFiles: 5,
  dateFormat: 'YYYY-MM-DD HH:mm:ss'
}
```

## Tâches Planifiées

Le système utilise BlazerJob pour la planification des tâches avec SQLite comme backend.

### Tâches par Défaut

1. **Publication Quotidienne**
   - Planification : `0 12 * * *` (midi)
   - Description : Publie du contenu généré automatiquement

2. **Vérification des Mentions**
   - Planification : `*/5 * * * *` (toutes les 5 minutes)
   - Description : Vérifie et répond aux mentions du bot

### Configuration

```javascript
jobs: {
  schedules: {
    dailyPost: '0 12 * * *',
    checkMentions: '*/5 * * * *'
  },
  maxAttempts: 3,       // Tentatives en cas d'échec
  backoffMs: 5000,      // Délai entre les tentatives
  lock: {
    acquireTimeout: 10000, // 10s pour acquérir un verrou
    timeout: 300000,     // 5 minutes max d'exécution
    retries: 5,         // Nombre de tentatives
    delay: 1000         // 1s entre les tentatives
  }
}
```

### Gestion des Tâches

Les tâches sont gérées via le module `src/jobs/` :

- `index.js` : Configuration et gestion des tâches
- `scheduler.js` : Définition des tâches planifiées

#### Ajouter une Nouvelle Tâche

1. Créer une fonction asynchrone pour votre tâche
2. L'enregistrer dans `scheduler.js`

```javascript
// Dans src/jobs/scheduler.js
const jobs = [
  {
    name: 'ma-tache',
    schedule: '0 * * * *', // Toutes les heures
    task: async () => {
      // Implémentation de la tâche
    },
    options: {
      timeout: 60000, // 1 minute max
      description: 'Description de la tâche'
    }
  }
];
```

### Surveillance et Maintenance

- Les logs des tâches sont enregistrés dans les fichiers de logs standards
- Les verrous sont automatiquement libérés en cas d'erreur
- La base de données SQLite est utilisée pour la persistance des états

### Variables d'Environnement

- `LOG_LEVEL` : Niveau de log (debug, info, warn, error)
- `NODE_ENV` : Environnement (development, production)
- `DATABASE_URL` : URL de la base de données (par défaut: `sqlite:./data/clippy.db`)
