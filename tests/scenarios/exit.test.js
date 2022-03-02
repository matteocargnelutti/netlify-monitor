/**
 * netlify-monitor
 * @module tests/scenarios/exit.test
 * @author Matteo Cargnelutti
 * @license MIT
 * @description "Exit" testing scenario ("Log off" button).
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
 * - Mock user info, websites and builds (10 websites, 0 pending or failed builds).
 */
beforeAll(async() => {
  browser = await getBrowser();
  page = await getExtensionPage(browser);

  await page.evaluate(async () => {
    const { mockUserInfo, mockWebsitesAndBuilds } = await import("../mocks/database.js");
    await mockUserInfo();
    await mockWebsitesAndBuilds(10, 0, 0);
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

describe('"Exit" testing scenario: Tests the "Log off" button lifecycle.', () => {

  test('Pressing the "exit" button clears the database and shows <authorization-dialog>', async () => {
    const passes = await page.evaluate( async() => {
      const { database } = await import("../database/index.js");

      const exitButton = document.querySelector("footer-toolbar button[name='exit']");
      const authorizationDialog = document.querySelector("authorization-dialog");

      exitButton.click();
      await new Promise(resolve => setTimeout(resolve, 250));

      let databaseWasEmptied = (
        (await database.userInfo.getAll()).length + 
        (await database.websites.getAll()).length +
        (await database.websites.getAll()).length
      ) === 0;

      let authorizationDialogShown = authorizationDialog.classList.contains("hidden") === false;

      return databaseWasEmptied && authorizationDialogShown;
    });
    expect(passes).toBe(true);
  });

});
