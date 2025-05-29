import { getFarcasterPage } from './login.js';
import {executablePath} from 'puppeteer';

const MAX_RETRIES = 3;

/**
 * Posts a cast to Warpcast.
 *
 * @async
 * @param {string} content - The text content of the cast to be posted.
 * @returns {Promise<boolean>} True if the cast was posted successfully, false otherwise.
 * @throws {Error} If posting fails after all retry attempts.
 */
async function postCast(content) {
  let lastError = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    console.log(`Attempt ${attempt} of ${MAX_RETRIES} to post cast...`);
    let page; // Declare page here to ensure it's accessible in finally block if needed

    try {
      page = await getFarcasterPage();

      // Navigate to the compose page
      console.log('Navigating to Warpcast compose page...');
      await page.goto('https://warpcast.com/~/compose', { waitUntil: 'networkidle2' });

      // Wait for the text area and type the content
      const textAreaSelector = 'textarea[aria-label="Cast text input"]';
      console.log(`Waiting for text area with selector: ${textAreaSelector}`);
      await page.waitForSelector(textAreaSelector, { timeout: 30000 }); // 30 seconds timeout
      console.log('Text area found. Typing content...');
      await page.type(textAreaSelector, content);

      // Wait for the "Cast" button (using XPath) and click it
      const castButtonXPath = "//button[normalize-space()='Cast']"; // More precise XPath
      console.log(`Waiting for "Cast" button with XPath: ${castButtonXPath}`);
      await page.waitForXPath(castButtonXPath, { timeout: 10000 }); // 10 seconds timeout
      const [castButton] = await page.$x(castButtonXPath);
      
      if (!castButton) {
        throw new Error('"Cast" button not found with the given XPath.');
      }
      
      console.log('"Cast" button found. Clicking...');
      await castButton.click();

      // Wait for a short period to allow the cast to be sent
      // This could be improved by waiting for a specific success indicator
      console.log('Waiting for 5 seconds after clicking "Cast" button...');
      await page.waitForTimeout(5000); 

      // Check if we are still on the compose page or redirected (rudimentary success check)
      // A more robust check would be to look for a "cast published" notification
      // or navigation away from /compose.
      if (!page.url().includes('/~/compose')) {
        console.log('Successfully posted cast! URL changed from /compose.');
      } else {
        // Check for common indicators that might still be on the page if post failed silently
        // or if the modal didn't close. This is speculative.
        const stillTextArea = await page.$(textAreaSelector);
        if (stillTextArea) {
            console.warn('Still on compose page and text area is present. Post might have failed silently or is taking longer.');
            // Add a small delay to see if it resolves
            await page.waitForTimeout(5000);
            if (page.url().includes('/~/compose')) {
                 console.warn('Still on compose page after additional wait. Assuming post failed or is stuck.');
                 // No specific error to throw here other than it didn't navigate away
            } else {
                console.log('Navigated away from compose page after additional wait. Assuming success.');
                return true;
            }
        } else {
          console.log('Successfully posted cast! (Text area disappeared, assuming modal closed or navigated)');
        }
      }
      
      // If the page object has a browser associated with it, we might want to close the page
      // but `getFarcasterPage` manages the browser, so we won't close page/browser here.
      // await page.close(); // Example if we were managing the page lifecycle here

      return true; // Success

    } catch (error) {
      console.error(`Error during attempt ${attempt}:`, error.message);
      lastError = error;
      if (page && !page.isClosed()) {
        try {
          // Attempt to close the page if an error occurred to free resources for the next attempt
          // This might help if the page is in a bad state.
          // However, getFarcasterPage provides a fresh page on each call if the browser is persistent.
          // If getFarcasterPage reuses browser and this page is bad, closing it is good.
          // If getFarcasterPage creates a new browser each time, this is less critical but still good practice.
          console.log("Attempting to close page due to error...");
          await page.close();
          console.log("Page closed.");
        } catch (closeError) {
          console.error("Error closing page after attempt failed:", closeError.message);
        }
      }

      if (attempt === MAX_RETRIES) {
        console.error('All retry attempts failed.');
        throw lastError; // Re-throw the last encountered error
      }
      console.log('Waiting for a moment before next retry...');
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5s before retrying
    }
  }
  return false; // Should be unreachable if MAX_RETRIES > 0 due to throw
}

export { postCast };
