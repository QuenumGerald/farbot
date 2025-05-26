// Wrapper pour le SDK Neynar pour gérer la compatibilité avec les modules ES
let NeynarAPIClient;

export async function getNeynarAPIClient() {
  if (!NeynarAPIClient) {
    const module = await import('@neynar/nodejs-sdk');
    NeynarAPIClient = module.NeynarAPIClient;
  }
  return NeynarAPIClient;
}
