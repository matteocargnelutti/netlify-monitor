/**
 * netlify-monitor
 * @module tests/setup
 * @author Matteo Cargnelutti
 * @license MIT
 * @description Puppeteer setup helpers for testing purposes.
 */
import puppeteer from "puppeteer";

/**
 * Launches a Chromium instance with the extension pre-loaded.
 * 
 * Notes:
 * The `PUPPETEER_EXEC_PATH` environment variable will be used if set.
 * The browser will run with no sandbox in that context.
 * 
 * This is to allow for the execution of this test suite in GitHub Actions: 
 * - https://github.com/marketplace/actions/puppeteer-headful
 * 
 * @returns {puppeteer.Browser}
 */
export async function getBrowser() {
  return await puppeteer.launch({
    headless: false,
    devtools: false,
    args: [
      '--disable-extensions-except=./extension',
      '--load-extension=./extension',
      '--window-size=585,685',
      process?.env?.PUPPETEER_EXEC_PATH ? '--no-sandbox' : ''
    ],
    slowMo: false,
    executablePath: process?.env?.PUPPETEER_EXEC_PATH
  });
}

/**
 * Opens the extension as a new tab.
 * @param {puppeteer.Browser} browser 
 * @return {puppeteer.Page}
 */
export async function getExtensionPage(browser) {
  const page = await browser.newPage();
  page.on('console', msg => console.log(msg.text));

  await page.goto("about:blank", { waitUntil: 'load' });

  await new Promise((resolve) => setTimeout(resolve, 1000));

  await page.goto(await getExtensionUrl(browser), { waitUntil: 'load' });
  return page;
}

/**
 * Determines the url of the extension based on the currently available targets.
 * @param {puppeteer.browser} browser  
 * @returns {?string}
 */
async function getExtensionUrl(browser) {
  const targets = await browser.targets();
  const extensionTarget = targets.find(target => target._targetInfo.type === "service_worker");

  if (!extensionTarget) {
    return null;
  }

  return extensionTarget._targetInfo.url.replace("background/index.js", "popup/index.html");
}