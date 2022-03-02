/**
 * netlify-monitor
 * @module dev/index
 * @author Matteo Cargnelutti
 * @license MIT
 * @description Main entry point for the "dev" screen. Sets up mock helpers.
 */
import { mockUserInfo, mockWebsitesAndBuilds } from "../extension/mocks/database.js";
import { runtimeSendMessage, actionSetBadgeText, i18nMockSetup, i18nGetMessage } from "../extension/mocks/chrome.js";
import { database } from "../extension/database/index.js";
import { UserInfo } from "../extension/database/tables/userInfo.js";

/**
 * Prepare Chrome i18n mock. Re-render app once-ready.
 */
i18nMockSetup().then(() => {
  // In case it failed to load content on time: Re-render all body-level components
  const iframeDocument = document.querySelector("#extension > iframe").contentWindow.document;

  for (const element of iframeDocument.querySelectorAll("body > *")) {
    try {
      element.renderInnerHTML();
    } catch (err) {}
  }
});

/**
 * Mocks `chrome.i18n` and `runtime.sendMessage` within #extension > iframe
 */
document.querySelector('#extension > iframe').contentWindow.chrome = {
  i18n: { getMessage: i18nGetMessage },
  runtime: { sendMessage: runtimeSendMessage },
  action: { setBadgeText: actionSetBadgeText }
}

/**
 * Prevent <form> submissions.
 */
document.querySelector('form').addEventListener('submit', (event) => {
  event.preventDefault();
});

/**
 * Capture clicks on form and, if it contains "data-to-mock", execute associated logic to edit the database.
 * Feedback will be logged in the "console" (textarea) along the way using `log()`.
 */
document.querySelector('form').addEventListener('click', async(event) => {
  
  if (!event.target.dataset.toMock) {
    return;
  }

  // De-activate all buttons while the operation is pending
  for (let button of document.querySelectorAll('button')) {
    button.setAttribute('disabled', 'disabled');
  }

  switch(event.target.dataset.toMock) {
    //
    // data-to-mock = "user-info-all":
    // Mock the entirety of the "userInfo" table.
    //
    case "user-info-all":
      await mockUserInfo();
      log(`"userInfo" table content mocked.`);
      break;

    //
    // data-to-mock = "user-info-refresh-request":
    // Simulate a "refresh request" for 10 seconds.
    //
    case "user-info-refresh-request":
      log(`Turning "refreshInProgress" to "true" for 10 seconds.`);
      await database.userInfo.updateEntry("refreshInProgress", true);

      setTimeout(async () => {
        await database.userInfo.updateEntry("refreshInProgress", false);
        log(`- Done.`);
      }, 10 * 1000);
      break;

    //
    // data-to-mock = "user-info-toggle-notifications"
    // Flips the value of "userWantsNotifications" in the `userInfo` table.
    //
    case "user-info-toggle-notifications":
      let userWantsNotifications = await database.userInfo.getByKey("userWantsNotifications"); 

      // Create entry if it doesn't exist
      if (userWantsNotifications === undefined) {
        userWantsNotifications = new UserInfo();
        userWantsNotifications.key("userWantsNotifications");
        userWantsNotifications.value = true;
      }
      else {
        userWantsNotifications.value = !userWantsNotifications.value;
      }

      await userWantsNotifications.save();

      log(`Switched "userInfo[].userWantsNotifications" to ${userWantsNotifications.value}.`);
      break;

    //
    // data-to-mock = "websites-and-builds":
    // Generate and store mock websites and associated builds.
    // 
    // Parameters of `mockWebsitesAndBuilds()` editable at form level:
    // - `total`: `input[name='input-websites']`
    // - `pendingBuilds`: (`input[name='input-pending-builds']`
    // - `failedBuilds`: `input[name='input-failed-builds']`
    //
    case "websites-and-builds":
      let total = document.querySelector("input[name='input-websites']").value;
      let pendingBuilds = document.querySelector("input[name='input-pending-builds']").value;
      let failedBuilds = document.querySelector("input[name='input-failed-builds']").value;

      total = Number(total);
      pendingBuilds = Number(pendingBuilds);
      failedBuilds = Number(failedBuilds); 

      log(`Mocking ${total} website(s) and build(s).`);
      log(`- Including:`);
      log(`-- ${pendingBuilds} pending build(s).`);
      log(`-- ${failedBuilds} failed build(s).`);

      try {
        await mockWebsitesAndBuilds(total, pendingBuilds, failedBuilds);
        log(`- Done.`);
      } 
      catch (err) {
        log(err);
      }
      break;

    //
    // data-to-mock = "clear-database":
    // Clears all tables from the database
    //
    case "clear-database":
      await database.userInfo.clearAll();
      await database.websites.clearAll();
      await database.builds.clearAll();
      log(`All tables were emptied.`);
      break;

    //
    // data-to-mock = "clear-console":
    // Clears the on-page "console".
    //
    case "clear-console": 
      document.getElementById('console').value = '';
      break;
  }

  // Re-activate all buttons
  for (let button of document.querySelectorAll('button')) {
    button.removeAttribute('disabled');
  }

});

/**
 * Appends a message to the on-screen "console".
 * @param {string} message 
 */
function log(message) {
  const textarea = document.getElementById('console');

  textarea.value += `${message}\n`;

  setTimeout(() => {
    textarea.scroll({ top: 100000, left: 0, behavior: "smooth" });
  }, 100);
}
