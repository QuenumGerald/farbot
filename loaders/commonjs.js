// Helper pour charger les modules CommonJS dans un environnement ES Modules
export function require(module) {
  return import(module);
}
