/**
 * netlify-monitor
 * @module popup/components/authorization-dialog
 * @author Matteo Cargnelutti
 * @license MIT
 * @description `<authorization-dialog>` Component.
 */
import { MESSAGE_IDS } from "../../constants/index.js";
import { database } from "../../database/index.js";
import { UserInfo } from "../../database/tables/userInfo.js";
import { liveQuery } from "../../lib/dexie.mjs";

/**
 * This full-window element shows when no Netlify Access Token is available in the database, prompting the user to authorize access.
 */
export class AuthorizationDialog extends HTMLElement {

  /**
   * Reference to Dexie Subscription for changes in the `userInfo` table for "netlifyAccessToken".
   * @type {?Dexie.Subscription}
   */
  netlifyAccessTokenObserver = null;

  /**
   * Upon injection into the DOM:
   * - Subscribe to database updates.
   * - Update component's inner HTML.
   * - Attach event listeners 
   */
  connectedCallback() {
    // Call `this.onNetlifyAccessTokenUpdate()` whenever the "netlifyAccessToken" entry of the "userInfo" table gets updated.
    this.netlifyAccessTokenObserver = liveQuery(
      () => database.userInfo.getByKey("netlifyAccessToken")
    ).subscribe({
      next: this.onNetlifyAccessTokenUpdate.bind(this),
      error: (error) => console.log(error),
    });

    this.renderInnerHTML();

    this.querySelector("button[name='authorize']").addEventListener(
      "click",
      this.onAuthorizeButtonClick.bind(this)
    );
  }

  /**
   * Upon ejection from the DOM:
   * - Unsubscribe from database updates.
   */
  disconnectedCallback() {
    this.netlifyAccessTokenObserver.unsubscribe();
  }

  /**
   * Show / hide component on update of "netlifyAccessToken" in the `userInfo` table.
   * The component should not be visible if the user is authenticated.
   * 
   * Bound to database updates in `connectedCallback()`.
   * 
   * @param {?UserInfo} result - Value returned for the query of "netlifyAccessToken" in the `userInfo` table.
   * @returns {void}
   */
  onNetlifyAccessTokenUpdate(result) {
    if (result && result.value) {
      this.classList.add("hidden");
    }
    else {
      this.classList.remove("hidden");
    }
  }

  /**
   * On click on the "authorize" button:
   * - Send an "NETLIFY_AUTH_REQUEST" message to the service worker
   * - De-activate the button for 10 seconds.
   * 
   * @param {Event} e
   * @returns {void}
   */
  onAuthorizeButtonClick(e) {
    e.preventDefault();

    chrome.runtime.sendMessage({messageId: MESSAGE_IDS.NETLIFY_AUTH_REQUEST});

    const button = this.querySelector("button[name='authorize']");
    button?.setAttribute("disabled", "disabled");
    setTimeout(() => button?.removeAttribute("disabled"), 10000);
  }

  /**
   * Sets the component's inner HTML.
   * To be called upon injection into the DOM.
   */
  renderInnerHTML() {
    this.innerHTML = /*html*/`
    <div>
      <img src="../assets/icon-512.png" alt="Netlify Monitor"/>
      <h1>${chrome.i18n.getMessage("app_description")}</h1>

      <p>${chrome.i18n.getMessage("authorization_dialog_intro")}</p>

      <button name="authorize">${chrome.i18n.getMessage("authorization_dialog_connect_button")}</button>

      <a target="_blank" rel="noopener" href="${chrome.i18n.getMessage("app_github_url")}">
        ${chrome.i18n.getMessage("authorization_dialog_connect_more_info")}
      </a>
    </div>
    `;
  }
}
customElements.define('authorization-dialog', AuthorizationDialog);
