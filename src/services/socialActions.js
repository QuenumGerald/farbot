import { getFarcasterPage } from './login.js';
import { createLogger } from '../config/logger.js'; // Assuming path from project structure

const logger = createLogger('socialActions');

/**
 * Attempts to follow a user on Warpcast given their profile URL.
 *
 * @async
 * @param {string} profileUrl - The full URL of the Warpcast user profile.
 * @returns {Promise<boolean>} True if successfully followed or already following, false otherwise.
 */
async function followUser(profileUrl) {
  if (!profileUrl || !profileUrl.startsWith('https://warpcast.com/') || profileUrl.endsWith('warpcast.com/')) {
    logger.warn(`Invalid profile URL for follow: ${profileUrl}. Must be a specific user profile.`);
    return false;
  }

  const MAX_RETRIES = 2;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    let page;
    try {
      logger.info(`Attempt ${attempt}/${MAX_RETRIES}: Following user at ${profileUrl}`);
      page = await getFarcasterPage();

      await page.goto(profileUrl, { waitUntil: 'networkidle2' });
      logger.debug(`Navigated to profile: ${profileUrl}`);

      // Selector for the follow button is CRITICAL and needs to be accurate.
      // Handles "Follow", "Following", or "Unfollow" states.
      const followButtonXPath = "//button[normalize-space()='Follow' or normalize-space()='Following' or normalize-space()='Unfollow']";
      logger.debug(`Waiting for follow button with XPath: ${followButtonXPath}`);
      await page.waitForXPath(followButtonXPath, { visible: true, timeout: 10000 });
      const [followButtonElement] = await page.$x(followButtonXPath);

      if (!followButtonElement) {
        logger.warn(`Follow button not found on ${profileUrl} using XPath: ${followButtonXPath}`);
        if (page && !page.isClosed()) await page.close();
        return false; 
      }

      const buttonText = await page.evaluate(button => button.textContent.trim(), followButtonElement);
      logger.debug(`Follow button text on ${profileUrl} is: "${buttonText}"`);

      if (buttonText === 'Following' || buttonText === 'Unfollow') {
        logger.info(`Already following user at ${profileUrl} (button text: "${buttonText}").`);
        if (page && !page.isClosed()) await page.close();
        return true; // Already followed or button indicates this state
      }

      if (buttonText === 'Follow') {
        await followButtonElement.click();
        logger.debug(`Clicked "Follow" button on ${profileUrl}.`);
        // Wait for the button text to change or for some other confirmation.
        // This XPath would wait for the button to change to "Following" or "Unfollow"
        const confirmationXPath = "//button[normalize-space()='Following' or normalize-space()='Unfollow']";
        logger.debug(`Waiting for follow confirmation with XPath: ${confirmationXPath}`);
        await page.waitForXPath(confirmationXPath, { visible: true, timeout: 7000 });
        logger.info(`Successfully followed user at ${profileUrl}. Button text likely updated.`);
      } else {
        logger.warn(`Follow button found on ${profileUrl}, but text is unexpected: "${buttonText}".`);
        if (page && !page.isClosed()) await page.close();
        return false; // Unexpected button state
      }
      
      if (page && !page.isClosed()) await page.close();
      return true;

    } catch (error) {
      logger.error(`Error following user ${profileUrl} (attempt ${attempt}/${MAX_RETRIES}): ${error.message}`, { stack: error.stack });
      if (page && !page.isClosed()) {
        try {
          await page.close();
        } catch (closeError) {
          logger.error('Error closing page after an error during followUser:', closeError.message);
        }
      }
      if (attempt === MAX_RETRIES) {
        logger.error(`Max retries reached for following ${profileUrl}. Action failed.`);
        return false; 
      }
      logger.info(`Waiting for 2 seconds before next retry for ${profileUrl}...`);
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s before retrying
    }
  }
  logger.error(`Action to follow ${profileUrl} failed after all retries and error handling.`);
  return false; // Should be unreachable if logic is correct and MAX_RETRIES > 0
}

export { followUser };
