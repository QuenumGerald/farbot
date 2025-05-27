// Wrapper pour le SDK Neynar pour gérer la compatibilité avec les modules ES
import { NeynarAPIClient, Configuration } from '@neynar/nodejs-sdk';

export function getNeynarAPIClient(apiKey) {
  const config = new Configuration({ apiKey });
  return new NeynarAPIClient(config);
}
