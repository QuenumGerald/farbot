// Test simple de sortie console
console.log('=== DÉBUT DU TEST ===');
console.log('Test de console.log');
console.error('Test de console.error');
console.warn('Test de console.warn');

// Test avec un délai pour voir si c'est un problème de timing
setTimeout(() => {
  console.log('Message après délai de 1 seconde');
  console.log('=== FIN DU TEST ===');
}, 1000);
