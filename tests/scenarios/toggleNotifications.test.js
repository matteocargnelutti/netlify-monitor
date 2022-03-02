/**
 * netlify-monitor
 * @module tests/scenarios/toogleNotifications.test
 * @author Matteo Cargnelutti
 * @license MIT
 * @description "Toggle Notifications" testing scenario.
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
 * - Mock user info.
 */
beforeAll(async() => {
  browser = await getBrowser();
  page = await getExtensionPage(browser);

  await page.evaluate(async () => {
    const { mockUserInfo } = await import("../mocks/database.js");
    await mockUserInfo();
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

describe('"Toggle Notifications" testing scenario: Tests notifications on/off switch.', () => {

  test('Pressing the "notifications" button of <footer-toolbar> toggles notifications on or off.', async () => {
    const checks = await page.evaluate(async () => {
      const { database } = await import("../database/index.js");

      const checks = {
        beforePress: false,
        firstPress: false,
        secondPress: false,
      };

      let userWantsNotifications = await database.userInfo.getByKey("userWantsNotifications");

      const notificationsButton = document.querySelector(
        "footer-toolbar button[name='notifications']"
      );

      const notificationsButtonIcon = document.querySelector(
        "footer-toolbar button[name='notifications'] img"
      );

      //
      // Before button is pressed: Notifications are off
      //
      checks.beforePress =
        userWantsNotifications.value === false &&
        notificationsButtonIcon.src.includes("bell-off.svg");

      //
      // First press: Notifications are on
      //
      notificationsButton.click();
      await new Promise((resolve) => setTimeout(resolve, 250));
      
      userWantsNotifications = await database.userInfo.getByKey(
        "userWantsNotifications"
      );

      checks.firstPress =
        userWantsNotifications.value === true &&
        notificationsButtonIcon.src.includes("bell-on.svg");

      //
      // Second press: Notifications are off
      //
      notificationsButton.click();
      await new Promise((resolve) => setTimeout(resolve, 250));

      userWantsNotifications = await database.userInfo.getByKey(
        "userWantsNotifications"
      );
      
      checks.secondPress =
        userWantsNotifications.value === false &&
        notificationsButtonIcon.src.includes("bell-off.svg");

      return checks;
    });
    expect(checks.beforePress).toBe(true);
    expect(checks.firstPress).toBe(true);
    expect(checks.secondPress).toBe(true);
  });

});
