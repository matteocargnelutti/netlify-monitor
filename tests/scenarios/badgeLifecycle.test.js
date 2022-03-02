/**
 * netlify-monitor
 * @module tests/scenarios/badgeLifecycle.test
 * @author Matteo Cargnelutti
 * @license MIT
 * @description "Badge Lifecycle" testing scenario.
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

/**
 * Before each test:
 * - Reload the extension's page. This will clear the current badge text.
 */
beforeEach(async() => {
  await page.reload();
});

describe('"Badge Lifecycle" testing scenario: Tests the extension\'s badge-based alert system.', () => {

  test("Service worker changes the badge's text when a new failed build was found.", async () => {
    const passes = await page.evaluate(async () => {
      const {default: triggerFailedBuildAlerts} = await import("../background/utils/triggerFailedBuildAlerts.js");

      const badgeTextBefore = await chrome.action.getBadgeText({});
      await triggerFailedBuildAlerts(); // Simulated here: part of a refresh request 
      const badgeTextAfter = await chrome.action.getBadgeText({});

      return badgeTextBefore === "" && badgeTextAfter !== "";
    });
    expect(passes).toBe(true);
  });

  test("Service worker ignores failed builds that have already been considered for an alert.", async () => {
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

      const badgeTextBefore = await chrome.action.getBadgeText({});
      await triggerFailedBuildAlerts(); // Simulated here: part of a refresh request 
      const badgeTextAfter = await chrome.action.getBadgeText({});

      return badgeTextBefore === "" && badgeTextAfter === "";
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

      const badgeTextBefore = await chrome.action.getBadgeText({});
      await triggerFailedBuildAlerts(); // Simulated here: part of a refresh request 
      const badgeTextAfter = await chrome.action.getBadgeText({});

      return badgeTextBefore === "" && badgeTextAfter === "";
    });
    expect(passes).toBe(true);
  });

  test("Opening the extension popup clears the badge's text.", async () => {
    await page.evaluate(async () => {
      await chrome.action.setBadgeText({text: "!"});
    });

    await page.reload();

    const passes = await page.evaluate(async() => {
      return await chrome.action.getBadgeText({}) === "";
    })
    expect(passes).toBe(true);
  });

});
