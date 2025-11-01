/* scripts/generate-auth.js
 * Generates auth.json with automatic login using Chrome.
 * Works on Windows, Mac, and Linux.
*/

const { chromium } = require('playwright');
const path = require('path');
require('dotenv').config();

const {
  GOOGLE_ACCOUNT_USER,
  GOOGLE_ACCOUNT_PASSWORD,
} = process.env;

const LOGIN_URL =
  'https://accounts.google.com/ServiceLogin' +
  '?service=wise&passive=true&continue=https%3A%2F%2Fmeet.google.com%2F';

(async () => {
  // Validate credentials
  if (!GOOGLE_ACCOUNT_USER || !GOOGLE_ACCOUNT_PASSWORD) {
    console.error('\n❌ Error: Missing credentials in .env file!');
    console.error('\nPlease ensure your .env file contains:');
    console.error('  GOOGLE_ACCOUNT_USER=your-email@gmail.com');
    console.error('  GOOGLE_ACCOUNT_PASSWORD=your-password\n');
    process.exit(1);
  }

  console.log('\n🚀 Launching Chrome for automatic authentication...');
  console.log(`📧 Using account: ${GOOGLE_ACCOUNT_USER}\n`);
  
  const browser  = await chromium.launch({ 
    channel: 'chrome',  // Use installed Chrome instead of Chromium
    headless: false,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-web-security',
    ]
  });
  const context  = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 720 }
  });
  const page     = await context.newPage();

  console.log('🌐 Navigating to Google sign-in...');
  await page.goto(LOGIN_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000); // Wait for page to fully load

  // Step 1: Enter Email
  console.log('📧 Entering email address...');
  await page.waitForSelector('input[type="email"]', { timeout: 30000 });
  await page.fill('input[type="email"]', GOOGLE_ACCOUNT_USER);
  await page.waitForTimeout(1000);
  
  // Click Next button
  await page.click('button:has-text("Next"), #identifierNext');
  console.log('✅ Email submitted');

  // Step 2: Enter Password
  console.log('🔑 Waiting for password field...');
  await page.waitForSelector('input[type="password"]', { timeout: 60000 });
  await page.waitForTimeout(2000);
  
  console.log('🔑 Entering password...');
  await page.fill('input[type="password"]', GOOGLE_ACCOUNT_PASSWORD);
  await page.waitForTimeout(1000);
  
  // Click Next button
  await page.click('button:has-text("Next"), #passwordNext');
  console.log('✅ Password submitted');

  // Step 3: Wait for Google Meet
  console.log('\n⏳ Waiting for Google Meet homepage...');
  console.log('   (If 2FA is required, please complete it manually in the browser)\n');
  
  await page.waitForURL(/https:\/\/meet\.google\.com\/.*/, { timeout: 0 });
  await page.waitForSelector('text=/New meeting|Start an instant meeting|Your meetings|Join a meeting/i', {
    timeout: 0,
  });

  // Save authentication state
  const savePath = path.resolve('auth.json');
  await context.storageState({ path: savePath });
  
  console.log('\n✅ SUCCESS! Authentication saved to:', savePath);
  console.log('✅ File size:', require('fs').statSync(savePath).size, 'bytes');

  await browser.close();
  console.log('✅ Browser closed. You can now run: npm run gen:auth\n');
})().catch((err) => {
  console.error('\n❌ Authentication failed:', err.message);
  console.error('\nTroubleshooting:');
  console.error('  1. Make sure Chrome is installed on your system');
  console.error('  2. Check your .env file has correct credentials');
  console.error('  3. If Google blocks login, try: npm run gen:auth:manual\n');
  process.exit(1);
});
