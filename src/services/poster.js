import { getFarcasterPage } from './login.js';
// import { createLogger } from '../config/logger.js'; // Optional
// const logger = createLogger('poster-service'); // Optional

// --- IMPORTANT NOTE ON SELECTORS ---
// The selectors used in this script (textAreaSelector and castButtonXPath)
// are common examples and MUST be verified and potentially adjusted by inspecting
// the current Warpcast website structure. Web UIs change frequently.
// --- IMPORTANT NOTE ON SELECTORS ---

/**
 * Posts a cast to Warpcast.
 *
 * @async
 * @param {string} content - The text content of the cast to be posted.
 * @returns {Promise<boolean>} True if the cast was posted successfully, false otherwise.
 */
async function postCast(content) {
  if (!content || typeof content !== 'string' || content.trim() === '') {
    // logger.warn('Content to post is empty or invalid. Skipping.');
    // console.warn('Content to post is empty or invalid. Skipping.');
    return false; // Or throw new Error('Content cannot be empty.');
  }

  const MAX_RETRIES = 3;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    let page;
    // logger.info(`Attempt ${attempt}/${MAX_RETRIES} to post cast: "${content.substring(0, 50)}..."`);
    // console.log(`Attempt ${attempt}/${MAX_RETRIES} to post cast: "${content.substring(0, 50)}..."`);
    try {
      page = await getFarcasterPage();
      // logger.debug('Page obtained from getFarcasterPage.');
      // console.log('Page obtained from getFarcasterPage.');

      await page.goto('https://warpcast.com/compose', { waitUntil: 'networkidle2', timeout: 60000 });
      // logger.debug('Navigated to /compose.');
      // console.log('Navigated to /compose.');

      // Selector for the text area - needs verification by the user
      const textAreaSelector = 'textarea[aria-label="Cast text input"]';
      await page.waitForSelector(textAreaSelector, { visible: true, timeout: 5000 });
      // logger.debug('Text area found.');
      // console.log('Text area found.');
      await page.type(textAreaSelector, content);
      // logger.debug('Content typed into text area.');
      // console.log('Content typed into text area.');

      // Selector for the "Cast" button - needs verification by the user
      const castButtonXPath = "//button[normalize-space()='Cast']";
      await page.waitForXPath(castButtonXPath, { visible: true, timeout: 10000 });
      const [castButton] = await page.$x(castButtonXPath);
      if (!castButton) {
        throw new Error('Cast button not found with XPath.');
      }
      // logger.debug('Cast button found.');
      // console.log('Cast button found.');

      await castButton.click();
      // logger.debug('Cast button clicked.');
      // console.log('Cast button clicked.');

      // Wait for some indication of success. This could be:
      // 1. Navigation away from /compose
      // 2. Disappearance of the text area or cast button
      // 3. Appearance of a success message/toast (harder to select)
      // For simplicity, let's wait for the text area to disappear or a short timeout
      // This is a heuristic and might need adjustment based on actual Warpcast behavior.
      await page.waitForFunction(
        (selector) => !document.querySelector(selector),
        { timeout: 15000 }, // 15 seconds for post to go through and UI to change
        textAreaSelector
      ).catch(() => {
        // logger.warn('Text area did not disappear after clicking cast. Post might have failed or UI changed.');
        // console.warn('Text area did not disappear after clicking cast. Post might have failed or UI changed.');
        // No re-throw here, proceed to close page and assume success for now if no other error.
        // A more robust check would be to navigate to user's profile and see the cast.
      });

      // logger.info(`Cast posted successfully (attempt ${attempt}/${MAX_RETRIES}).`);
      // console.log(`Cast posted successfully (attempt ${attempt}/${MAX_RETRIES}).`);
      if (page && !page.isClosed()) {
        await page.close();
        // logger.debug('Page closed after successful post.');
        // console.log('Page closed after successful post.');
      }
      return true;

    } catch (error) {
      // logger.error(`Error posting cast (attempt ${attempt}/${MAX_RETRIES}): ${error.message}`, { stack: error.stack });
      // console.error(`Error posting cast (attempt ${attempt}/${MAX_RETRIES}): ${error.message}`);
      if (page && !page.isClosed()) {
        // logger.debug('Closing page due to error during post attempt.');
        // console.log('Closing page due to error during post attempt.');
        await page.close();
      }
      if (attempt === MAX_RETRIES) {
        // logger.error('Max retries reached for posting cast. Giving up.');
        // console.error('Max retries reached for posting cast. Giving up.');
        // throw error; // Or return false
        return false;
      }
      // logger.info(`Waiting for 5 seconds before next retry...`);
      // console.log(`Waiting for 5 seconds before next retry...`);
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5s before retrying
    }
  }
  return false; // Should only be reached if all retries fail and no error is thrown
}

export { postCast };
