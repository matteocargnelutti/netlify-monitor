/**
 * netlify-monitor
 * @module tests/scenarios/withWebsites.test
 * @author Matteo Cargnelutti
 * @license MIT
 * @description "With Websites" testing scenario.
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
 * - Mock user info, websites and builds (10 websites, 1 pending build, 1 newly failed build).
 */
beforeAll(async() => {
  browser = await getBrowser();
  page = await getExtensionPage(browser);

  await page.evaluate(async () => {
    const { mockUserInfo, mockWebsitesAndBuilds } = await import("../mocks/database.js");
    await mockUserInfo();
    await mockWebsitesAndBuilds(10, 1, 1);
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

describe('"With Websites" testing scenario: UI checks with an authenticated user, 10 websites, 1 pending build, 1 newly failed build.', () => {

  test("`<authorization-dialog>` is hidden in that context.", async () => {
    const passes = await page.evaluate(() => {
      const element = document.querySelector("authorization-dialog");
      return element.classList.contains("hidden");
    });
    expect(passes).toBe(true);
  });

  test("`<sites-list>` shows 10 websites.", async () => {
    const count = await page.evaluate(() => {
      const elements = document.querySelectorAll("sites-list ul li");
      return elements.length;
    });
    expect(count).toBe(10);
  });

  test("`<sites-list>` shows 1 failed build.", async () => {
    const count = await page.evaluate(() => {
      const elements = document.querySelectorAll("sites-list ul li.failed");
      return elements.length;
    });
    expect(count).toBe(1);
  });

  test("`<sites-list>` shows 1 pending build.", async () => {
    const count = await page.evaluate(() => {
      const elements = document.querySelectorAll("sites-list ul li.pending");
      return elements.length;
    });
    expect(count).toBe(1);
  });

});
