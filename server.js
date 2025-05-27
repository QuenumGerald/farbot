// Fichier server.js ultra-minimal pour Render
import http from 'http';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';

// Obtenir le chemin du répertoire actuel en ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Créer un simple serveur HTTP pour que Render le considère comme "vivant"
const server = http.createServer((req, res) => {
  // Retourner un état de santé
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', uptime: process.uptime() }));
    return;
  }
  
  // Page par défaut
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(`<html><body><h1>Clippy Bot</h1><p>Bot en cours d'exécution depuis ${process.uptime()} secondes</p></body></html>`);
});

// Démarrer le serveur sur le port défini par Render ou 3000 par défaut
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Serveur HTTP démarré sur le port ${PORT}`);
});

// Démarrer le bot dans un processus séparé
console.log('Démarrage du bot Clippy...');
const botProcess = spawn('node', [path.join(__dirname, 'src/start-render.js')], {
  stdio: 'inherit',
  detached: true
});

botProcess.on('exit', (code) => {
  console.log(`Le processus bot s'est arrêté avec le code: ${code}`);
  // On ne quitte pas le serveur principal, il reste vivant
});

// Gérer l'arrêt propre
process.on('SIGTERM', () => {
  console.log('Signal SIGTERM reçu, arrêt du serveur...');
  if (botProcess) {
    process.kill(-botProcess.pid);
  }
  server.close(() => {
    console.log('Serveur HTTP arrêté');
    process.exit(0);
  });
});

// Écrire des logs persistants
setInterval(() => {
  try {
    fs.appendFileSync(path.join(__dirname, 'server-alive.txt'), `[${new Date().toISOString()}] Server heartbeat\n`);
    console.log(`[${new Date().toISOString()}] Server heartbeat`);
  } catch (err) {
    console.error('Erreur lors de l\'écriture du fichier de log:', err);
  }
}, 300000); // Toutes les 5 minutes

console.log('Serveur principal prêt et en attente de requêtes');
