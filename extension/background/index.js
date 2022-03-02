/**
 * netlify-monitor
 * @module background/index
 * @author Matteo Cargnelutti
 * @license MIT
 * @description Entry point of the extension's service worker. Sets intervals, listens for messages, manages API calls and storage.
 */
import { MESSAGE_IDS } from "../constants/index.js";
import { utils } from "./utils/index.js";
import { database } from "../database/index.js";
import { UserInfo } from "../database/tables/userInfo.js";

/**
 * Set a 2-minute "alarm" cycle for this service worker.
 */
chrome.alarms.create("background-2-minutes", { periodInMinutes: 2 });

/**
 * Listens and handles incoming alarm cycles.
 * 
 * Alarms handled:
 * - `background-2-minute`: Sends a `REFRESH_REQUEST` message in reaction.
 */
chrome.alarms.onAlarm.addListener(function (alarm) {
  switch (alarm.name) {
    case "background-2-minutes":
      backgroundMessageHandler({messageId: MESSAGE_IDS.REFRESH_REQUEST});
      break;
  }
});

/**
 * Handles incoming messages.
 * This function runs for every incoming `chrome.runtime` message.
 *
 * Messages handled:
 * - `NETLIFY_AUTH_REQUEST`
 * - `REFRESH_REQUEST`
 * - `CLEAR_ALL_REQUEST`
 * - `TOGGLE_NOTIFICATIONS_REQUEST`
 *
 * See detail of message types in `shared.constants.MESSAGE_TYPES`.
 * 
 * @param {object} request
 * @returns {Promise}
 * @async
 */
async function backgroundMessageHandler(request) {
  // Ignore messages that don't have a `messageId` property.
  if (!request.messageId) {
    return;
  }

  switch (request.messageId) {
    case MESSAGE_IDS.NETLIFY_AUTH_REQUEST:
      try {
        const token = await utils.requestNetlifyToken();
        return await backgroundMessageHandler({messageId: MESSAGE_IDS.REFRESH_REQUEST});
      }
      catch(err) {
        console.log(err);
      }
      break;

    case MESSAGE_IDS.REFRESH_REQUEST:
      // If a `REFRESH_REQUEST` is already in progress, stop here
      const refreshInProgress = await database.userInfo.getByKey("refreshInProgress");
      if (refreshInProgress && refreshInProgress.value === true) {
        return;
      }

      // Make sure a Netlify Access Token is available
      const token = await database.userInfo.getByKey("netlifyAccessToken");

      if (!token || !token.value) {
        return;
      }

      try {
        // Mark `REFRESH_REQUEST` as "In progress"
        await database.userInfo.updateEntry("refreshInProgress", true);

        await utils.pullWebsitesFromNetlify(token.value);
        await utils.pullBuildsFromNetlify(token.value);
        await utils.triggerFailedBuildAlerts();
      }
      catch(err) {
        console.log(err);
      }
      // In any case: 
      // - Mark `REFRESH_REQUEST` as "Complete"
      // - Update `lastRefresh` entry in the `userInfo` table.
      finally {
        await database.userInfo.updateEntry("refreshInProgress", false);
        await database.userInfo.updateEntry("lastRefresh", new Date());
      }
      break;

    case MESSAGE_IDS.CLEAR_ALL_REQUEST:
      try {
        await database.userInfo.clearAll();
        await database.websites.clearAll();
        await database.builds.clearAll();
      }
      catch(err) {
        console.log(err);
      }
      break;

    case MESSAGE_IDS.TOGGLE_NOTIFICATIONS_REQUEST:
      utils.toggleNotifications();
      break;

    default:
      throw new Error(
        `Incoming message id has no match. Value given: ${request.messageId}`
      );
  }
}
chrome.runtime.onMessage.addListener(backgroundMessageHandler);
