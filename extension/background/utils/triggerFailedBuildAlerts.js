/**
 * netlify-monitor
 * @module background/utils/triggerFailedBuildAlerts
 * @author Matteo Cargnelutti
 * @license MIT
 * @description Utility for triggering and processing alerts (push notifications and badge status) related to failed builds.
 */
import { database } from "../../database/index.js";
import { Build } from "../../database/tables/builds.js";

/**
 * Checks the `builds` table for failed builds that weren't considered for an alert yet.
 * 
 * If there's at least one new broken build:
 * - The extension's badge will show an exclamation point.
 * - A notification will be triggered, if the user chose to activate that feature.
 * 
 * Will only check builds that were created in the past 24 hours.
 *  
 * @returns {Promise<boolean>}
 * @async
 */
export default async function() {
  // Pull all broken builds that weren't considered for an alert yet.
  /** @type {Build[]} */
  const builds = [];

  for (let build of await database.builds.getAllForPeriod(24)) {
    if (
      build.isDone === true &&
      build.hasFailed === true &&
      build.consideredForAlert === false
    ) {
      builds.push(build);
    }
  }

  // Update the extension's badge if there's at least 1 new broken build.
  if (builds.length > 0) {
    chrome.action.setBadgeText({text: '!'});
  }

  // Prepare and send a push notification if:
  // - There's at least 1 new broken build 
  // - User turned notifications on.
  const userWantsNotifications = await database.userInfo.getByKey("userWantsNotifications");

  if (
    builds.length > 0 &&
    userWantsNotifications &&
    userWantsNotifications.value === true
  ) {
    let { title, message } = await getNotificationCopy();

    // The notification message lists the urls of websites for which the latest build failed.
    const websiteUrls = [];

    for (let build of builds) {
      const website = await database.websites.getBySiteId(build.siteId);
      websiteUrls.push(website.url);
    }

    message += "\n" + websiteUrls.join(", ");

    chrome.notifications.create("failed-build-notification", {
      type: "basic",
      iconUrl: "/assets/icon-256.png",
      title: title,
      message: message,
      priority: 2,
      eventTime: Date.now() + 5000,
    });

  }

  // Mark builds from this batch as "consideredForAlert".
  for (let build of builds) {
    build.consideredForAlert = true;
  }

  await database.builds.bulkSave(builds);

  return true;
}

/**
 * Grab internationalized copy for the notification directly from file.
 * This is required as service workers don't support `chrome.i18n.getMessage()`.
 * 
 * This workaround was suggested by Chrome's devs: 
 * - https://groups.google.com/a/chromium.org/g/chromium-extensions/c/dG6JeZGkN5w
 * 
 * @returns {Promise<Object>} Containing base "title" and "message" copy for the notification.
 * @async
 */
async function getNotificationCopy() {
  const locale = navigator.language.substring(0, 2);

  let copy = null;
  
  try {
    copy = await fetch(`/_locales/${locale}/messages.json`);
  }
  // Fallback to english
  catch(err) {
    copy = await fetch(`/_locales/en/messages.json`);
  }

  copy = await copy.json();

  return {
    title: copy.failed_build_notification_title.message,
    message: copy.failed_build_notification_message.message,
  }
}

