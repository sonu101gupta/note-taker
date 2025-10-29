/* scripts/generate-auth-manual.js
 * Generates auth.json with fully manual login (no auto-fill).
 * More reliable with Google's security.
*/

const { chromium } = require('playwright');
const path = require('path');
require('dotenv').config();

const LOGIN_URL =
  'https://accounts.google.com/ServiceLogin' +
  '?service=wise&passive=true&continue=https%3A%2F%2Fmeet.google.com%2F';

(async () => {
  console.log('\n🔐 Manual Google Authentication\n');
  console.log('A browser will open. Please:');
  console.log('  1. Log in with your Google bot account manually');
  console.log('  2. Complete any 2FA or security checks');
  console.log('  3. Wait until you see the Google Meet homepage');
  console.log('  4. The browser will close automatically\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
    ]
  });
  
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 720 }
  });
  
  const page = await context.newPage();

  console.log('📖 Opening Google sign-in page...');
  await page.goto(LOGIN_URL);

  console.log('⏳ Please log in manually in the browser...');
  console.log('⏳ Waiting for Google Meet homepage...\n');
  
  // Wait for successful login (Google Meet homepage)
  await page.waitForURL(/https:\/\/meet\.google\.com\/.*/, { timeout: 0 });
  await page.waitForSelector('text=/New meeting|Start an instant meeting|Your meetings|Join a meeting/i', {
    timeout: 0,
  });

  const savePath = path.resolve('auth.json');
  await context.storageState({ path: savePath });
  
  console.log('\n✅ Success! Authentication saved to:', savePath);

  await browser.close();
  console.log('✅ Browser closed. You can now run the bot!\n');
})().catch((err) => {
  console.error('\n❌ Authentication failed:', err.message);
  process.exit(1);
});

