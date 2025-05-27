import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

console.log(process.env.GOOGLE_API_KEY, process.env.NEYNAR_API_KEY, process.env.NEYNAR_SIGNER_UUID, process.env.BOT_HANDLE);