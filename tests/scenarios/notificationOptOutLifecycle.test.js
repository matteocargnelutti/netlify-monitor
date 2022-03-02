/**
 * netlify-monitor
 * @module tests/scenarios/notificationOptOutLifecycle.test
 * @author Matteo Cargnelutti
 * @license MIT
 * @description "Notification Opt-out Lifecycle" testing scenario.
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
 * - Mock user info, websites and builds (10 websites, 0 pending build, 2 newly failed build).
 * - Toggle notification preferences OFF.
 */
beforeAll(async() => {
  browser = await getBrowser();
  page = await getExtensionPage(browser);

  await page.evaluate(async () => {
    const { mockUserInfo, mockWebsitesAndBuilds } = await import("../mocks/database.js");
    const { database } = await import("../database/index.js");
    
    await mockUserInfo();
    await mockWebsitesAndBuilds(10, 0, 2);
    await database.userInfo.updateEntry("userWantsNotifications", false);
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

/**
 * Before each test:
 * - Clear notifications so we can trace which test triggers them.
 */
beforeEach(() => {
  page.evaluate(() => {
    chrome.notifications.clear("failed-build-notification");
  });
});

describe('"Notification Opt-out Lifecycle" testing scenario.', () => {

  test("Service worker fires a notification if user opted-out, even if new failed builds were found.", async () => {
    const passes = await page.evaluate(async () => {
      const {default: triggerFailedBuildAlerts} = await import("../background/utils/triggerFailedBuildAlerts.js");
      await triggerFailedBuildAlerts(); // Simulated here: part of a refresh request 

      const notifications = await new Promise(resolve => {
        chrome.notifications.getAll((notifications) => resolve(notifications));
      });
      return "failed-build-notification" in notifications === false;
    });
    expect(passes).toBe(true);
  });

});
