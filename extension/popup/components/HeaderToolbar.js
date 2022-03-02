/**
 * netlify-monitor
 * @module popup/components/header-toolbar
 * @author Matteo Cargnelutti
 * @license MIT
 * @description `<header-toolbar>` Component.
 */
import { MESSAGE_IDS } from "../../constants/index.js";
import { database } from "../../database/index.js";
import { UserInfo } from "../../database/tables/userInfo.js";
import { liveQuery } from "../../lib/dexie.mjs";

/**
 * This element, meant to be displayed on top of the popup window, allows users to manually pull data from the Netlify API.
 * 
 * It observes the "refreshInProgress" entry of the `userInfo` table to determine if a refresh is currently processing.
 */
export class HeaderToolbar extends HTMLElement {

  /**
   * Reference to Dexie Subscription for changes in the `userInfo` table for "refreshInProgress".
   * @type {?Dexie.Subscription}
   */
  refreshInProgressObserver = null;

  /**
   * Upon injection into the DOM:
   * - Subscribe to database updates.
   * - Update component's inner HTML.
   * - Attach event listeners 
   */
  connectedCallback() {
    // Call `this.onRefreshInProgressUpdate()` whenever the "refreshInProgress" entry of the "userInfo" table gets updated.
    this.refreshInProgress = liveQuery(
      () => database.userInfo.getByKey("refreshInProgress")
    ).subscribe({
      next: this.onRefreshInProgressUpdate.bind(this),
      error: (error) => console.log(error),
    });

    this.renderInnerHTML();

    this.querySelector("button[name='refresh']").addEventListener(
      "click",
      this.onRefreshButtonClick.bind(this)
    );
  }

  /**
   * Upon ejection from the DOM:
   * - Unsubscribe from database updates.
   */
  disconnectedCallback() {
    this.refreshInProgressObserver.unsubscribe();
  }

  /**
   * Updates UI based on whether or not the extension is currently pulling data from the Netlify API.
   * - If it is: disable the "refresh" button and show a context message.
   * - It it is not: enable the "refresh" button and display when data was updated for the last time.
   * 
   * @param {?UserInfo} result - Value returned for the query of "refreshInProgress" in the `userInfo` table.
   * @returns {void}
   * @async
   */
  async onRefreshInProgressUpdate(result) {
    const refreshButton = this.querySelector("button[name='refresh']");
    const messageDisplay = this.querySelector("h2 span");

    if (result && result.value === true) {
      refreshButton.setAttribute("disabled", "disabled");
      messageDisplay.innerText = chrome.i18n.getMessage("header_toolbar_refresh_pending");
    }
    else {
      refreshButton.removeAttribute("disabled");

      let message = chrome.i18n.getMessage("header_toolbar_last_refresh") + ` `;
      let lastRefresh = await database.userInfo.getByKey("lastRefresh");

      if (!lastRefresh) { // If "lastRefresh" is not set at database level, mock it with the current date
        lastRefresh = new UserInfo();
        lastRefresh.key = "lastRefresh";
        lastRefresh.value = new Date();
      }

      message += new Intl.DateTimeFormat("default", {timeStyle: "short"}).format(lastRefresh.value);
      messageDisplay.innerText = message;
    }
  }

  /**
   * On click on the "refresh" button:
   * - Send an "REFRESH_REQUEST" message to the service worker
   * @param {Event} e
   * @returns {void}
   */
   onRefreshButtonClick(e) {
    e.preventDefault();
    chrome.runtime.sendMessage({messageId: MESSAGE_IDS.REFRESH_REQUEST});
  }

  /**
   * Sets the component's inner HTML.
   * To be called upon injection into the DOM.
   */
  renderInnerHTML() {
    this.innerHTML = /*html*/`
    <h2><span><span></h2>
    
    <button name="refresh" title="${chrome.i18n.getMessage("header_toolbar_refresh_button_tooltip")}">
      <img src="../assets/refresh.svg" alt="${chrome.i18n.getMessage("header_toolbar_refresh_button")}" />
    </button>
    `;
  }
}
customElements.define('header-toolbar', HeaderToolbar);
