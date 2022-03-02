/**
 * netlify-monitor
 * @module tests/scenarios/landing.test
 * @author Matteo Cargnelutti
 * @license MIT
 * @description "Landing" testing scenario.
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
 * - Make sure the database is empty.
 */
beforeAll(async() => {
  browser = await getBrowser();
  page = await getExtensionPage(browser);

  await page.evaluate(async () => {
    const { database } = await import("../database/index.js");
    await database.userInfo.clearAll();
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

describe('"Landing" testing scenario: UI checks with an empty database.', () => {

  test("`<authorization-dialog>` is shown in that context.", async () => {
    const passes = await page.evaluate(() => {
      const dialog = document.querySelector("authorization-dialog");
      return dialog.classList.contains("hidden") === false;
    });
    expect(passes).toBe(true);
  });

});
