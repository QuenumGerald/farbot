import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import path from 'path';
// import { createLogger } from '../config/logger.js'; // Optional
// const logger = createLogger('login-service'); // Optional

// Apply the stealth plugin
puppeteer.use(StealthPlugin());

const userDataDir = path.resolve(process.cwd(), './user_data');

/**
 * Launches a Puppeteer browser instance, navigates to Warpcast,
 * and handles login if necessary.
 * @returns {Promise<import('puppeteer').Page>} Puppeteer page object authenticated with Warpcast.
 */
async function getFarcasterPage() {
  // Ensure user_data directory exists
  if (!fs.existsSync(userDataDir)) {
    // logger.info(`Creating user data directory: ${userDataDir}`);
    fs.mkdirSync(userDataDir, { recursive: true });
  }

  // logger.info('Launching browser...');
  const browser = await puppeteer.launch({
    headless: false,
    userDataDir: userDataDir,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage', // Often needed in CI/Docker environments
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      // '--single-process', // Only if not using headless:false, and if issues arise
      '--disable-gpu' // Often needed in CI/Docker environments
    ]
  });

  const page = await browser.newPage();
  // logger.info('Browser launched, new page created.');

  try {
    // logger.info('Checking login status by navigating to settings...');
    await page.goto('https://warpcast.com/~/settings', { waitUntil: 'networkidle2', timeout: 60000 });

    // If it redirects to /login, or shows login elements, user is not logged in.
    // A more robust check would be to look for a specific element only present on the settings page when logged in,
    // or checking if the current URL is still /~/settings.
    if (page.url().includes('/login')) { // Simple check, might need to be more robust
      // logger.info('Not logged in. Navigating to Warpcast for manual login.');
      await page.goto('https://warpcast.com', { waitUntil: 'networkidle2', timeout: 60000 });
      console.log('[LOGIN REQUIRED] Please log in to Warpcast in the browser window. Waiting for you to complete...');
      // logger.info('[LOGIN REQUIRED] Please log in to Warpcast in the browser window. Waiting for you to complete...');

      // Wait for user to login. This can be tricky.
      // Option 1: Wait for navigation away from a page that includes /login or to the homepage after login.
      // Option 2: Wait for a specific element that appears only when logged in.
      // Option 3: Wait for a significant URL change that indicates login.
      // For this implementation, let's wait for either the URL to NOT include '/login' anymore,
      // or for a known post-login element (e.g., a feed element).
      // We'll use a long timeout to give the user ample time.
      await page.waitForFunction(
        () => !window.location.pathname.includes('/login') && (document.querySelector('article') || document.querySelector('[data-testid="feed-item"]')), // Example selectors
        { timeout: 300000 } // 5 minutes timeout for manual login
      );
      // logger.info('Login detected or timeout reached.');
    } else {
      // logger.info('User is already logged in.');
    }
    // At this point, the page should be logged in.
    // Return the page, but not the browser. The caller of getFarcasterPage might want to do more with this browser instance.
    // However, if each call to getFarcasterPage is meant to be self-contained for one operation, then browser should be closed by the function that uses the page.
    // For the current design (e.g., poster.js calling it once per post), keeping browser open and returning page is fine.
    // The browser will be closed by the main script or when the process ends.
    // If multiple services use getFarcasterPage, a shared browser instance management might be better.
    // For now, let's assume the page object is returned and the browser remains open.
    // The responsibility to close the browser will be on the process that initially calls this.
    // This is a simplification. A more robust solution might involve a browser manager service.
    return page;
  } catch (error) {
    // logger.error('Error in getFarcasterPage:', { message: error.message, stack: error.stack });
    // If an error occurs, try to close the browser before throwing
    if (browser) {
      // logger.info('Closing browser due to error in getFarcasterPage.');
      await browser.close();
    }
    throw error;
  }
}

export { getFarcasterPage };
