/**
 * netlify-monitor
 * @module tests/scenarios/notificationOptInLifecycle.test
 * @author Matteo Cargnelutti
 * @license MIT
 * @description "Notification Opt-in Lifecycle" testing scenario.
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
 * - Toggle notification preferences ON.
 */
beforeAll(async() => {
  browser = await getBrowser();
  page = await getExtensionPage(browser);

  await page.evaluate(async () => {
    const { mockUserInfo, mockWebsitesAndBuilds } = await import("../mocks/database.js");
    const { database } = await import("../database/index.js");
    
    await mockUserInfo();
    await mockWebsitesAndBuilds(10, 0, 2);
    await database.userInfo.updateEntry("userWantsNotifications", true);
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

describe('"Notification Opt-in Lifecycle" testing scenario.', () => {

  test("Service worker fires a notification if user opted-in and at least 1 new failed build was found.", async () => {
    const passes = await page.evaluate(async () => { 
      const {default: triggerFailedBuildAlerts} = await import("../background/utils/triggerFailedBuildAlerts.js");
      await triggerFailedBuildAlerts(); // Simulated here: part of a refresh request

      const notifications = await new Promise(resolve => {
        chrome.notifications.getAll((notifications) => resolve(notifications));
      });
      return "failed-build-notification" in notifications;
    });
    expect(passes).toBe(true);
  });

  test("Service worker doesn't fire a notification for failed builds that were already considered.", async () => {
    // Before this test runs:
    // - Mark all builds as "considered for alert"
    await page.evaluate(async () => {
      const { database } = await import("../database/index.js");
      const builds = await database.builds.getAll();

      for (let build of builds) {
        build.consideredForAlert = true;
      }

      await database.builds.bulkSave(builds);
    });

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

  test("Service worker ignores failed builds that date for more than 24 hours ago.", async () => {
    // Before this test runs, mark all builds as:
    // - Not considered for alerts
    // - Created more than 24 hours ago
    await page.evaluate(async () => {
      const { database } = await import("../database/index.js");
      const builds = await database.builds.getAll();

      for (let build of builds) {
        build.consideredForAlert = false;
        build.createdAt = new Date(
          build.createdAt.setHours(build.createdAt.getHours() - 25)
        );
      }

      await database.builds.bulkSave(builds);
    });

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
