// Script pour corriger la fonction searchAndFollowUsers
const fs = require('fs');
const path = require('path');

// Chemin du fichier socialActions.js
const filePath = path.resolve(__dirname, 'src/services/socialActions.js');

// Lire le contenu du fichier
let content = fs.readFileSync(filePath, 'utf8');

// Modification 1: Modifier les "return followCount" par "continue" à l'intérieur de la boucle
content = content.replace(
  /if \(!username\) \{\s+console\.log\('Utilisateur sans nom d\\'utilisateur, abandon'\);\s+return followCount;\s+\}/g,
  "if (!username) {\n        console.log('Utilisateur sans nom d\\'utilisateur, passage au suivant');\n        continue;\n      }"
);

// Modification 2: Convertir le traitement d'un seul utilisateur en boucle sur tous les utilisateurs
content = content.replace(
  /\/\/ Prendre le premier utilisateur\s+const user = users\[0\];/g,
  "// Parcourir tous les utilisateurs trouvés jusqu'à atteindre maxFollows\n      for (const user of users) {\n        // Vérifier si on a atteint le maximum de follows\n        if (followCount >= maxFollows) {\n          console.log(`Nombre maximum de follows atteint (${maxFollows})`);\n          break;\n        }"
);

// Modification 3: Convertir les "return followCount" en "continue" dans la boucle
content = content.replace(
  /if \(diffDays < daysThreshold\) \{\s+console\.log\(`Déjà suivi \${username} dans les \${daysThreshold} derniers jours, on l'ignore`\);\s+skippedCount\+\+;\s+return followCount;\s+\}/g,
  "if (diffDays < daysThreshold) {\n            console.log(`Déjà suivi ${username} dans les ${daysThreshold} derniers jours, passage au suivant`);\n            skippedCount++;\n            continue;\n          }"
);

// Modification 4: Modifier les autres "return followCount" dans la fonction pour passer à l'utilisateur suivant
content = content.replace(
  /if \(!navigationSuccess\) \{\s+console\.log\(`Échec de la navigation vers le profil de \${username} après plusieurs tentatives`\);\s+return followCount;\s+\}/g,
  "if (!navigationSuccess) {\n        console.log(`Échec de la navigation vers le profil de ${username} après plusieurs tentatives`);\n        continue;\n      }"
);

content = content.replace(
  /console\.error\('Erreur lors de l\\'attente après navigation:', error\.message\);\s+return followCount;/g,
  "console.error('Erreur lors de l\\'attente après navigation:', error.message);\n        continue;"
);

content = content.replace(
  /if \(alreadyFollowing\) \{\s+console\.log\(`Déjà en train de suivre \${username}`\);\s+skippedCount\+\+;\s+return followCount;\s+\}/g,
  "if (alreadyFollowing) {\n        console.log(`Déjà en train de suivre ${username}`);\n        skippedCount++;\n        continue;\n      }"
);

// Modification 5: Déplacer les autres "return followCount" en dehors de la boucle
content = content.replace(
  /console\.error\('Erreur lors de la recherche du bouton par texte:', error\.message\);\s+return followCount;/g,
  "console.error('Erreur lors de la recherche du bouton par texte:', error.message);\n            continue;"
);

content = content.replace(
  /console\.error\('Erreur lors de la sélection du bouton marqué:', error\.message\);\s+return followCount;/g,
  "console.error('Erreur lors de la sélection du bouton marqué:', error.message);\n              continue;"
);

// Modification 6: Ajouter une accolade fermante pour la boucle des utilisateurs
// et Mettre à jour le message de fin
content = content.replace(
  /console\.log\(`Recherche et follow terminés\. Résultats: \${followCount} utilisateurs suivis, \${skippedCount} ignorés\.`\);\s+return followCount;/g,
  "      }\n\n      console.log(`Recherche et follow terminés. Résultats: ${followCount} utilisateurs suivis, ${skippedCount} ignorés.`);\n      return followCount;"
);

// Écrire le contenu modifié dans le fichier
fs.writeFileSync(filePath, content, 'utf8');

console.log("Correction de la fonction searchAndFollowUsers terminée !");
