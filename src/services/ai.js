import Deepseek from 'deepseek-sdk';

/**
 * Generates a social media post using the Deepseek API.
 *
 * @async
 * @param {string} prompt - The prompt to generate the post from.
 * @returns {Promise<string>} The generated text content.
 * @throws {Error} If the DEEPSEEK_API_KEY environment variable is not set.
 * @throws {Error} If the API call fails or returns an unexpected response structure.
 */
async function generatePost(prompt) {
  const apiKey = process.env.DEEPSEEK_API_KEY;

  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY environment variable is not set.');
  }

  const client = new Deepseek({ apiKey });

  try {
    const response = await client.chat.completions.create({
      model: 'deepseek-chat', // Recommended model, can be changed based on DeepSeek's offerings
      messages: [
        { role: 'user', content: prompt }
      ],
    });

    if (response && response.choices && response.choices.length > 0 && response.choices[0].message && response.choices[0].message.content) {
      return response.choices[0].message.content;
    } else {
      console.error('Unexpected response structure from Deepseek API:', response);
      throw new Error('Failed to extract content from Deepseek API response.');
    }
  } catch (error) {
    console.error('Error calling Deepseek API:', error);
    throw new Error(`Deepseek API request failed: ${error.message}`);
  }
}

export { generatePost };

// To test: node -e "require('./src/services/ai.js').generatePost('Présente le token Clippy').then(console.log).catch(console.error)"
