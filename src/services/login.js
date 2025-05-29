import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import path from 'path';

// Apply the stealth plugin
puppeteer.use(StealthPlugin());

const USER_DATA_DIR = path.resolve('./user_data');

/**
 * Launches a Puppeteer browser instance, navigates to Warpcast,
 * and handles login if necessary.
 * @returns {Promise<import('puppeteer').Page>} Puppeteer page object authenticated with Warpcast.
 */
async function getFarcasterPage() {
  // Ensure user_data directory exists
  if (!fs.existsSync(USER_DATA_DIR)) {
    fs.mkdirSync(USER_DATA_DIR, { recursive: true });
  }

  const browser = await puppeteer.launch({
    headless: false, // Headful mode to allow for manual login
    userDataDir: USER_DATA_DIR, // Persist user sessions and cookies
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      // '--single-process', // Disabling this as it might cause issues with stealth plugin or extensions
      '--disable-gpu'
    ]
  });

  const page = await browser.newPage();

  try {
    // Navigate to a page that requires login to check status
    await page.goto('https://warpcast.com/~/settings', { waitUntil: 'networkidle2' });
    const currentUrl = page.url();

    // If not on the settings page or redirected to a page containing 'login', user is not logged in
    if (!currentUrl.includes('/~/settings') || currentUrl.includes('login')) {
      console.log('Not logged into Warpcast or session expired. Navigating to login page...');
      await page.goto('https://warpcast.com', { waitUntil: 'networkidle2' });
      console.log('Please log in to Warpcast manually in the browser window.');
      console.log('The script will attempt to continue after detecting a successful login (navigation to https://warpcast.com/)...');

      // Wait for successful login, indicated by navigation to the main feed URL
      // This might need adjustment based on actual Warpcast redirect behavior after login
      await page.waitForFunction(
        () => window.location.href === 'https://warpcast.com/' || 
              !window.location.href.includes('login') && document.querySelector('nav a[href="/"]') !== null,
        { timeout: 300000 } // 5 minutes timeout for manual login
      );
      console.log('Login detected or timeout reached. Assuming login was successful if not timed out.');
      // Navigate to settings again to confirm or to be on a known page
      await page.goto('https://warpcast.com/~/settings', { waitUntil: 'networkidle2' });
      if (!page.url().includes('/~/settings')) {
        console.warn('Still not on settings page. Login might have failed or taken too long.');
      } else {
        console.log('Successfully navigated to Warpcast settings. Logged in.');
      }
    } else {
      console.log('Already logged into Warpcast.');
    }
  } catch (error) {
    console.error('Error during Warpcast login check:', error);
    // Optionally, close the browser or rethrow, depending on desired error handling
    // await browser.close();
    // throw error;
  }

  return page;
}

export { getFarcasterPage };
