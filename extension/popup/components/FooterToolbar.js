/**
 * netlify-monitor
 * @module popup/components/footer-toolbar
 * @author Matteo Cargnelutti
 * @license MIT
 * @description `<footer-toolbar>` Component.
 */
import { MESSAGE_IDS } from "../../constants/index.js";
import { database } from "../../database/index.js";
import { UserInfo } from "../../database/tables/userInfo.js";
import { liveQuery } from "../../lib/dexie.mjs";

/**
 * This element, meant to be displayed on bottom of the popup window, allows users to turn notification on and off and log off from the extension.
 * 
 * It observes the "userWantsNotifications" entry of the `userInfo` table to determine if notifications are currently active.
 */
export class FooterToolbar extends HTMLElement {

  /**
   * Reference to Dexie Subscription for changes in the `userInfo` table for "userWantsNotifications".
   * @type {?Dexie.Subscription}
   */
  userWantsNotificationsObserver = null;

  /**
   * Upon injection into the DOM:
   * - Subscribe to database updates.
   * - Update component's inner HTML.
   * - Attach event listeners 
   */
  connectedCallback() {
    // Call `this.onUserWantsNotificationsUpdate()` whenever the "userWantsNotifications" entry of the "userInfo" table gets updated.
    this.userWantsNotificationsObserver = liveQuery(
      () => database.userInfo.getByKey("userWantsNotifications")
    ).subscribe({
      next: this.onUserWantsNotificationsUpdate.bind(this),
      error: (error) => console.log(error),
    });

    this.renderInnerHTML();

    this.querySelector("button[name='notifications']").addEventListener(
      "click",
      this.onNotificationsButtonClick.bind(this)
    );

    this.querySelector("button[name='exit']").addEventListener(
      "click",
      this.onExitButtonClick.bind(this)
    );

    this.querySelector("button[name='github']").addEventListener(
      "click",
      this.onGitHubButtonClick.bind(this)
    );
  }

  /**
   * Upon ejection from the DOM:
   * - Unsubscribe from database updates.
   */
  disconnectedCallback() {
    this.userWantsNotificationsObserver.unsubscribe();
  }

  /**
   * Updates the "notification" button's UI based on the users' current notification preferences.
   * 
   * @param {?UserInfo} result  - Value returned for the query of "userWantsNotifications" in the `userInfo` table.
   * @returns {void}
   */
  onUserWantsNotificationsUpdate(result) {
    const button = this.querySelector("button[name='notifications']");
    const onOff = result && result.value === true ? "on" : "off";
    button.querySelector("img").src = `../assets/bell-${onOff}.svg`;
    button.querySelector("span").innerText = chrome.i18n.getMessage(`footer_toolbar_notifications_button_${onOff}`);
  }

  /**
   * On click on the "notifications" button:
   * - Send an "TOGGLE_NOTIFICATIONS_REQUEST" message to the service worker
   * 
   * @param {Event} e 
   * @returns {void}
   */
  onNotificationsButtonClick(e) {
    e.preventDefault();
    chrome.runtime.sendMessage({messageId: MESSAGE_IDS.TOGGLE_NOTIFICATIONS_REQUEST});
  }

  /**
   * On click on the "exit" button:
   * - Send an "CLEAR_ALL_REQUEST" message to the service worker
   * 
   * @param {Event} e 
   * @returns {void}
   */
  onExitButtonClick(e) {
    e.preventDefault();
    chrome.runtime.sendMessage({messageId: MESSAGE_IDS.CLEAR_ALL_REQUEST});
  }

  /**
   * Opens the project's GitHub page in a new tab on click on the "GitHub" button.
   * Note: this should be an <a> (to fix).
   * 
   * @param {Event} e 
   * @returns {void}
   */
  onGitHubButtonClick(e) {
    e.preventDefault();
    window.open(chrome.i18n.getMessage("app_github_url"), '_blank');
  }

  /**
   * Sets the component's inner HTML.
   * To be called upon injection into the DOM.
   */
  renderInnerHTML() {
    this.innerHTML = /*html*/`
    <button name="notifications" title="${chrome.i18n.getMessage("footer_toolbar_notifications_button_tooltip")}">
      <img src="../assets/bell-off.svg" aria-hidden="true"/>
      <span>${chrome.i18n.getMessage("footer_toolbar_notifications_button_off")}</span>
    </button>

    <button name="exit" title="${chrome.i18n.getMessage("footer_toolbar_exit_button_tooltip")}">
      <img src="../assets/exit.svg" aria-hidden="true"/>
      <span>${chrome.i18n.getMessage("footer_toolbar_exit_button")}</span>
    </button>

    <button name="github" title="${chrome.i18n.getMessage("footer_toolbar_github_button_tooltip")}">
      <img src="../assets/github.svg" aria-hidden="true"/>
      <span>${chrome.i18n.getMessage("footer_toolbar_github_button")}</span>
    </button>
    `;
  }
}
customElements.define('footer-toolbar', FooterToolbar);
