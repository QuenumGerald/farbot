import Deepseek from 'deepseek-sdk';
// import { createLogger } from '../config/logger.js'; // Optional
// const logger = createLogger('ai-service'); // Optional

/**
 * Generates content using the Deepseek API.
 *
 * @async
 * @param {string} prompt - The prompt to generate content from.
 * @returns {Promise<string>} The generated text content.
 * @throws {Error} If the DEEPSEEK_API_KEY environment variable is not set.
 * @throws {Error} If the API call fails or returns an unexpected response structure.
 */
async function generatePost(prompt) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    // logger.error('DEEPSEEK_API_KEY environment variable is not set.');
    throw new Error('DEEPSEEK_API_KEY environment variable is not set.');
  }

  // Note: The Deepseek SDK might take the API key directly in the constructor
  // or expect it to be set globally depending on the SDK version.
  // The provided snippet `new Deepseek(apiKey)` implies it might be passed to the constructor.
  // If it's `new Deepseek({ apiKey: apiKey })` or `new DeepseekClient({ apiKey })`, adjust as per SDK docs.
  // Assuming `new Deepseek(apiKey)` is a placeholder for correct SDK initialization.
  // Based on a previous subtask (installing deepseek-sdk), the initialization is:
  // const client = new Deepseek({ apiKey });
  const client = new Deepseek({ apiKey }); // Corrected based on common SDK patterns / previous context
  // logger.info(`Generating post with prompt: "${prompt}"`);

  try {
    const response = await client.chat.completions.create({
      model: 'deepseek-chat', // Or 'deepseek-coder' if more appropriate for a specific task
      messages: [
        { role: 'user', content: prompt }
        // You can add a system prompt if needed, e.g.:
        // { role: 'system', content: 'You are a helpful assistant.' }
      ],
      // Optional parameters:
      // max_tokens: 150,
      // temperature: 0.7, 
    });

    if (response && response.choices && response.choices.length > 0 && response.choices[0].message && response.choices[0].message.content) {
      const generatedText = response.choices[0].message.content.trim();
      // logger.info(`Generated text: "${generatedText}"`);
      return generatedText;
    } else {
      // logger.warn('No content generated or unexpected response structure from Deepseek API.');
      // console.dir(response, { depth: null }); // For debugging the response
      throw new Error('No content generated or unexpected response structure from Deepseek API.');
    }
  } catch (error) {
    // logger.error('Error calling Deepseek API:', { message: error.message, stack: error.stack, responseData: error.response?.data });
    // console.error('Deepseek API Error Response:', error.response?.data); // For debugging
    // Check if the error object has more specific details, e.g., error.response.data
    const errorMessage = error.response?.data?.error?.message || error.message;
    throw new Error(`Error calling Deepseek API: ${errorMessage}`);
  }
}

export { generatePost };

// To test from the command line (ensure DEEPSEEK_API_KEY is set):
// node -e "require('./src/services/ai.js').generatePost('Tell me a short story about a robot.').then(console.log).catch(console.error);"
