/**
 * netlify-monitor
 * @module tests/scenarios/refreshRequest.test
 * @author Matteo Cargnelutti
 * @license MIT
 * @description "Refresh Request" testing scenario.
 */
import puppeteer from "puppeteer";
import { getBrowser, getExtensionPage } from "../setup.js";

/**
 * Determines if this test suite should run.
 * - This test suite requires a valid Netlify Access Token, pointing to an account with at least 1 website.
 * - Will be skipped if the `TESTS_NETLIFY_ACCESS_TOKEN` environment variable is not defined.
 * @constant
 */
const conditionalTest = process.env.TESTS_NETLIFY_ACCESS_TOKEN ? describe : describe.skip;

/** 
 * @type {?puppeteer.Browser} 
 */
let browser = null;

/** 
 * @type {?puppeteer.Page} 
 */
let page = null;

/**
 * Before this test suite runs:
 * - Initialize Puppeteer, open the extension in a new tab.
 * - Mock user info, make sure there are no websites and no builds.
 * - Grab Netlify Access Token from `TESTS_NETLIFY_ACCESS_TOKEN`.
 */
beforeAll(async() => {
  browser = await getBrowser();
  page = await getExtensionPage(browser);

  const netlifyAccessToken = process.env.TESTS_NETLIFY_ACCESS_TOKEN;

  await page.evaluate(async (netlifyAccessToken) => {
    const { mockUserInfo } = await import("../mocks/database.js");
    const { database } = await import("../database/index.js");

    await mockUserInfo();

    await database.userInfo.updateEntry("netlifyAccessToken", netlifyAccessToken);

    await database.websites.clearAll();
    await database.builds.clearAll();

  }, netlifyAccessToken);

  await page.waitForTimeout(500);
});

/**
 * After the test suite ran:
 * - Close the browser
 */
afterAll(async() => {
  browser.close();
});

conditionalTest('"Refresh Request" testing scenario.', () => {

  test('Websites and builds are pulled from the Netlify API when user presses the "refresh" button.', async () => {

    const checks = await page.evaluate(async () => {
      const { database } = await import("../database/index.js");

      const checks = {
        before: {
          buttonEnabled: false,
          noWebsites: false,
          noBuilds: false,
        },
        during: {
          buttonDisabled: false,
        },
        after: {
          buttonEnabled: false,
          hasWebsites: false,
          hasBuilds: false
        }
      }

      const refreshButton = document.querySelector("header-toolbar button[name='refresh']");

      // Before refresh
      checks.before.noWebsites = (await database.websites.getAll()).length === 0;
      checks.before.noBuilds = (await database.builds.getAll()).length === 0;
      checks.before.buttonEnabled = refreshButton.getAttribute("disabled") === null;

      // During refresh
      refreshButton.click();
      await new Promise(resolve => setTimeout(resolve, 250));
      checks.during.buttonDisabled = refreshButton.getAttribute("disabled") !== null;

      await new Promise(resolve => setTimeout(resolve, 3000));

      // After refresh
      checks.after.hasWebsites = (await database.websites.getAll()).length > 0;
      checks.after.hasBuilds = (await database.builds.getAll()).length > 0;
      checks.after.buttonEnabled = refreshButton.getAttribute("disabled") === null;

      return checks;
    });
    expect(checks.before.noWebsites).toBe(true);
    expect(checks.before.noBuilds).toBe(true);
    expect(checks.before.buttonEnabled).toBe(true);
    expect(checks.during.buttonDisabled).toBe(true);
    expect(checks.after.hasWebsites).toBe(true);
    expect(checks.after.hasBuilds).toBe(true);
    expect(checks.after.buttonEnabled).toBe(true);
  });

})