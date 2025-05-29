import { getFarcasterPage } from './login.js';
import { createLogger } from '../config/logger.js'; // Adjust path as needed

const logger = createLogger('userSearch');

/**
 * Searches for users on Warpcast by keywords.
 *
 * @async
 * @param {string[]} keywords - An array of keywords to search for.
 * @returns {Promise<string[]>} A promise that resolves to an array of unique user profile URLs.
 * @throws {Error} If searching fails after all retry attempts.
 */
async function searchUsersByKeywords(keywords) {
  if (!keywords || keywords.length === 0) {
    logger.warn('No keywords provided for user search.');
    return [];
  }

  const MAX_RETRIES = 2; // Simple retry for the whole search process
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    let page;
    try {
      logger.info(`Attempt ${attempt}: Searching users for keywords: "${keywords.join(', ')}"`);
      page = await getFarcasterPage();

      // Navigate to the main search page
      await page.goto('https://warpcast.com/search', { waitUntil: 'networkidle2' });
      logger.debug('Navigated to /search');

      // Type keywords into the search input
      // Common selectors: input[type="search"], input[placeholder*="Search"]
      // Using the placeholder from the prompt
      const searchInputSelector = 'input[type="search"]'; 
      await page.waitForSelector(searchInputSelector, { visible: true, timeout: 15000 });
      await page.type(searchInputSelector, keywords.join(' '));
      logger.debug(`Typed keywords: "${keywords.join(' ')}"`);

      // Submit the search (e.g., press Enter)
      await page.keyboard.press('Enter');
      logger.debug('Pressed Enter to initiate search.');

      // Wait for navigation or results to load.
      // This might be a new page URL or dynamic loading.
      // Look for a "People" tab/filter and click it.
      // Using XPath placeholder from the prompt
      const peopleTabSelector = '//a[contains(text(), "People")] | //button[contains(text(), "People")]';
      logger.debug(`Waiting for People tab with XPath: ${peopleTabSelector}`);
      await page.waitForXPath(peopleTabSelector, { visible: true, timeout: 15000 });
      const [peopleTabElement] = await page.$x(peopleTabSelector);
      
      if (!peopleTabElement) {
        logger.warn('Could not find "People" tab/filter.');
        // Close page before returning or throwing
        if (page) await page.close();
        return []; // Or throw error if this is critical
      }
      await peopleTabElement.click();
      logger.debug('Clicked "People" tab.');

      // Wait for user profiles to load under the People tab
      // This selector also needs to be specific to Warpcast's structure
      // Using placeholder from the prompt, assuming it's a link within the results area.
      // Increased timeout for results to appear.
      logger.debug('Waiting for user profiles to load (heuristic selector: a[href^="/"])...');
      await page.waitForSelector('a[href^="/"]', { timeout: 20000 }); 
      logger.debug('User results page loaded (heuristically).');
      
      // Extract profile URLs
      // This selector needs to be precise. It should target the <a> tags
      // that link directly to user profiles within the search results list.
      // Using the highly speculative selector from the prompt.
      const profileLinkSelector = 'div[role="listitem"] a[href*="/"]'; 
      logger.debug(`Attempting to extract profiles with selector: ${profileLinkSelector}`);
      const profileUrls = await page.evaluate((selector) => {
        const links = Array.from(document.querySelectorAll(selector));
        // Filter out non-profile links if necessary, ensure they are full URLs
        // and conform to typical Warpcast profile URL structure.
        return links
          .map(link => link.href)
          .filter(href => {
            try {
              const url = new URL(href); // Ensure it's a valid URL
              // Check if it's a Warpcast domain and a user profile path
              return url.hostname === 'warpcast.com' && 
                     !url.pathname.startsWith('/~/') && // Exclude settings, compose, etc.
                     !url.pathname.includes('/search') && // Exclude search links
                     url.pathname.length > 1 && // Ensure there's a path beyond just "/"
                     !url.pathname.substring(1).includes('/'); // Simple check for direct user profile (e.g. /username not /username/casts)
            } catch (e) {
              return false; // Invalid URL
            }
          });
      }, profileLinkSelector);

      logger.info(`Found ${profileUrls.length} potential user profiles after initial query.`);
      
      // Deduplicate URLs
      const uniqueProfileUrls = [...new Set(profileUrls)];
      logger.info(`Found ${uniqueProfileUrls.length} unique user profiles.`);
      logger.debug(`Unique profiles: ${uniqueProfileUrls.join(', ')}`);

      await page.close(); // Close the page after successful operation
      return uniqueProfileUrls;

    } catch (error) {
      logger.error(`Error during user search (attempt ${attempt}/${MAX_RETRIES}): ${error.message}`, { stack: error.stack });
      if (page && !page.isClosed()) {
        try {
          await page.close(); // Ensure page is closed on error
        } catch (closeError) {
          logger.error('Error closing page after an error:', closeError.message);
        }
      }
      if (attempt === MAX_RETRIES) {
        logger.error('Max retries reached for user search. Rethrowing error.');
        throw error; // Rethrow after max retries
      }
      logger.info(`Waiting for 2 seconds before next retry...`);
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s before retrying
    }
  }
  return []; // Should be unreachable if error is rethrown or MAX_RETRIES > 0
}

export { searchUsersByKeywords };
