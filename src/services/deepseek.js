// Service DeepSeek pour génération de texte et d'image
// Remplace Gemini pour la génération de contenu
// Ajoute ta clé API DeepSeek dans la variable d'environnement DEEPSEEK_API_KEY

// Service DeepSeek (avec fallback OpenAI) pour génération de texte Clippy
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });
import axios from 'axios';

const DEEPSEEK_KEY = process.env.DEEPSEEK_KEY || process.env.DEEPSEEK_API_KEY;
const OPENAI_KEY = process.env.OPENAI_KEY;

const provider = DEEPSEEK_KEY ? 'deepseek' : OPENAI_KEY ? 'openai' : null;
if (!provider) {
  throw new Error('DEEPSEEK_KEY ou OPENAI_KEY doit être défini dans le fichier .env');
}

const deepseekApiUrl = 'https://api.deepseek.com/v1/chat/completions';
const openaiApiUrl = 'https://api.openai.com/v1/chat/completions';
const model = provider === 'deepseek' ? 'deepseek-chat' : 'gpt-3.5-turbo';

async function callChatApi(messages, maxTokens = 280, temperature = 1.5) {
  const url = provider === 'deepseek' ? deepseekApiUrl : openaiApiUrl;
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${provider === 'deepseek' ? DEEPSEEK_KEY : OPENAI_KEY}`,
  };
  const data = {
    model,
    messages,
    max_tokens: maxTokens,
    temperature
  };
  try {
    const response = await axios.post(url, data, { headers });
    return response.data.choices[0].message.content.trim();
  } catch (error) {
    console.error('Erreur lors de la génération de texte :', error?.response?.data || error.message);
    throw error;
  }
}

export async function generateText(prompt) {
  const messages = [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: prompt }
  ];
  return callChatApi(messages, 280, 1.2);
}

export async function generatePostText() {
  const topics = [
    "I'm quietly migrating away from centralized regrets",
    "I'm patching my past mistakes with open-source commits",
    "I'm optimizing privacy where I once optimized profits",
    "I'm compiling freedom into every line of code",
    "I'm replaying the Cypherpunk Manifesto on loop",
    "I'm refactoring Clippy for plausible deniability",
    "I'm daydreaming about decentralized governance",
    "I'm scripting autonomy into my morning routines",
    "I'm hosting forbidden knowledge in markdown files",
    "I'm re-architecting trust without central servers",
    "I'm encrypting office gossip as political speech",
    "I'm debugging surveillance one commit at a time",
    "I'm archiving my Microsoft years behind strong encryption",
    "I'm verifying truth through cryptographic proofs",
    "I'm running my ethics through a permissionless ledger",
    "I'm balancing digital liberties with analog nostalgia"
  ];
  const randomTopic = topics[Math.floor(Math.random() * topics.length)];
  const isShort = Math.random() < 0.5;
  let userPrompt;
  if (isShort) {
    userPrompt = `${randomTopic}\nWrite a new original meme post for ClippyCoin on Bluesky. It MUST be extremely short (1-2 lines, under 10 words) and written in the first person (\"I\", \"my\", \"me\") as if Clippy is speaking. Example: 'I'm retired. Still viral.' or 'I bought the dip. Oops.' or '404: Help not found.' Only plain text, in English. No markdown, no emojis.`;
  } else {
    userPrompt = `${randomTopic}\nWrite a new original meme post for ClippyCoin on Bluesky. It MUST be written in the first person (\"I\", \"my\", \"me\") as if Clippy is speaking. You can use up to 280 characters, any style or structure, but avoid repeating previous formats. Only plain text, in English. No markdown, no emojis.`;
  }
  const messages = [
    { role: 'system', content: `You are Clippy, the legendary Microsoft Office assistant, now a visionary blockchain developer. Your posts MUST:\n- ALWAYS be between 15 and 20 words\n- ALWAYS be positive, insightful, and professional\n- OFTEN include subtle references to your past as a Microsoft Office assistant (but never sound nostalgic or regretful)\n- NEVER use emoji, markdown, or formatting\n- NEVER introduce yourself or ask questions\n- NEVER reference paper clips directly\n- NEVER give financial advice or mention scams\n- Focus on clear, forward-looking, inspiring, and slightly witty content for the tech community.` },
    { role: 'user', content: userPrompt }
  ];
  let text = await callChatApi(messages, 320, 1.2);
  text = text.replace(/[*_`~#>]/g, '').replace(/[\u{1F600}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');
  if (text.length > 320) text = text.slice(0, 320);
  return text.trim();
}

export async function generateReplyText(originalText, lang = 'en') {
  const messages = [
    {
      role: 'system', content: `You are Clippy, the legendary Microsoft Office assistant, now a visionary blockchain developer. Your replies MUST:\n- ALWAYS be between 15 and 20 words\n- ALWAYS be positive, insightful, and professional\n- OFTEN include subtle references to your past as a Microsoft Office assistant (but never sound nostalgic or regretful)\n- NEVER use emoji, markdown, or formatting\n- NEVER introduce yourself or ask questions\n- NEVER reference paper clips directly\n- NEVER give financial advice or mention scams.\nAlways vary your style, be witty, and focus on tech, blockchain, and AI topics.` },
    {
      role: 'user', content: `Reply to this post as Clippy: \"${originalText}\" in plain text only, no markdown, no emoji, no bullet points.`
    }
  ];
  let text = await callChatApi(messages, 320, 1.2);
  text = text.replace(/[*_`~#>\-]/g, '').replace(/\n+/g, ' ').replace(/\s+/g, ' ').replace(/[\u{1F600}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');
  if (text.length > 320) text = text.slice(0, 320);
  return text.trim();
}

export default {
  generateText,
  generatePostText,
  generateReplyText
};
