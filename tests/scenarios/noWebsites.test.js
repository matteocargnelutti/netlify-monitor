/**
 * netlify-monitor
 * @module tests/scenarios/noWebsites.test
 * @author Matteo Cargnelutti
 * @license MIT
 * @description "No Websites" testing scenario.
 */
import puppeteer from "puppeteer";
import { getBrowser, getExtensionPage } from "../setup.js";

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
 */
beforeAll(async() => {
  browser = await getBrowser();
  page = await getExtensionPage(browser);

  await page.evaluate(async () => {
    const { mockUserInfo } = await import("../mocks/database.js");
    const { database } = await import("../database/index.js");

    await mockUserInfo();
    await database.websites.clearAll();
    await database.builds.clearAll();
  });

  await page.waitForTimeout(500);
});

/**
 * After the test suite ran:
 * - Close the browser
 */
afterAll(async() => {
  browser.close();
});

describe('"No Websites" testing scenario: UI checks with an authenticated user, but no websites or builds.', () => {

  test("`<authorization-dialog>` is hidden in that context.", async () => {
    const passes = await page.evaluate(() => {
      const element = document.querySelector("authorization-dialog");
      return element.classList.contains("hidden");
    });
    expect(passes).toBe(true);
  });

  test("`<sites-list>` shows an empty list.", async () => {
    const passes = await page.evaluate(() => {
      const element = document.querySelector("sites-list div.empty");
      return element ? true : false;
    });
    expect(passes).toBe(true);
  });

});
