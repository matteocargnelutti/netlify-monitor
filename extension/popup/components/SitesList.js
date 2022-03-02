/**
 * netlify-monitor
 * @module popup/components/sites-list
 * @author Matteo Cargnelutti
 * @license MIT
 * @description `<sites-list>` Component.
 */
import { database } from "../../database/index.js";
import { Website } from "../../database/tables/websites.js";
import { Build } from "../../database/tables/builds.js";
import { liveQuery } from "../../lib/dexie.mjs";

/**
 * @typedef WebsitePlusBuild
 * @description Holds data for a given website and its latest build.
 * @type {object}
 * @property {Website} website 
 * @property {?Build} build 
 */

/**
 * This element lists websites present in the database and shows the status of their latest build.
 * 
 * Websites are listed from "most recently updated" to last. 
 * 
 * Observes changes in the `websites` database table directly.
 */
export class SitesList extends HTMLElement {

  /**
   * Reference to Dexie Subscription for changes in the `websites` table.
   * @type {?Dexie.Subscription}
   */
  websitesObserver = null;

  /**
   * List of all websites (sorted by "lastUpdate" desc) and their latest associated build, if any.
   * @type {WebsitePlusBuild[]}
   */
  websitesPlusBuild = [];

  /**
   * Upon injection into the DOM:
   * - Subscribe to database updates.
   * - Update component's inner HTML.
   */
  async connectedCallback() {
    // Call `this.onWebsitesUpdate()` whenever the "websites" table gets updated.
    this.websitesObserver = liveQuery(
      () => database.websites.getAll(true)
    ).subscribe({
      next: this.onWebsitesUpdate.bind(this),
      error: (error) => console.log(error)
    })

    this.renderInnerHTML();
  }

  /**
   * Upon ejection from the DOM:
   * - Unsubscribe from database updates.
   */
  disconnectedCallback() {
    this.websitesObserver.unsubscribe();
  }

  /**
   * Uses the latest list of websites from the database to update UI.
   * Associates each website with their latest build and re-renders the component.
   * 
   * @param {Website[]} results - Results returned from the querying of the `websites` table.
   * @returns {void} 
   * @async
   */
  async onWebsitesUpdate(results) {
    this.websitesPlusBuild = [];

    if (!results || results.length === 0) {
      return;
    }

    for (let result of results) {
      /** @type {WebsitePlusBuild} */
      let websitePlusBuild = { website: result, build: null };

      let builds = await database.builds.getBySiteId(result.siteId);
      if (builds) {
        websitePlusBuild.build = builds[0];
      }

      this.websitesPlusBuild.push(websitePlusBuild);
    }

    this.renderInnerHTML();

  }

  /**
   * Sets the component's inner HTML.
   * To be called upon injection into the DOM and following re-renders.
   */
  renderInnerHTML() {
    //
    // No websites to display
    //
    if (this.websitesPlusBuild.length === 0) {
      this.innerHTML = /*html*/`
      <div class="empty">
        <img src="../assets/icon-512.png" aria-hidden="true"/>
        <p>${chrome.i18n.getMessage("sites_list_empty_caption")}</p>
      </div>`;
      return;
    }

    //
    // List of websites to display
    //
    let listHTML = "";
    for (let entry of this.websitesPlusBuild) {
      // Defaults for current entry:
      // - No class
      // - Use either website or build update time as a date to display
      // - Caption shows latest build was successful
      // - Inspect url redirects to website overview
      let itemClass = "";
      let itemDate = entry.build ? entry.build.createdAt : entry.website.lastUpdate;
      let itemCaption = chrome.i18n.getMessage("sites_list_build_successful_caption");
      let itemInspectUrl = `https://app.netlify.com/sites/${entry.website.name}/overview`;

      // Update caption and class for a "pending" build
      if (entry.build && entry.build.isDone === false) {
        itemClass = "pending";
        itemCaption = chrome.i18n.getMessage("sites_list_build_pending_caption");
      }

      // Update caption and class for a "failed" build (takes precedence)
      if (entry.build && entry.build.hasFailed === true) {
        itemClass = "failed";
        itemCaption = chrome.i18n.getMessage("sites_list_build_failed_caption");
      }

      // Narrow-down "inspect" url to a specific deploy id, if available
      if (entry.build && entry.build.deployId) {
        itemInspectUrl = `https://app.netlify.com/sites/${entry.website.name}/deploys/${entry.build.deployId}`;
      }

      let formattedItemDate = new Intl.DateTimeFormat("default", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(itemDate);

      listHTML += /*html*/`
      <li class="${itemClass}">
        <h3>
          <a target="_blank" 
             rel="noopener" 
             href="${entry.website.url}">
             ${entry.website.name}
          </a>
        </h3>

        <p>${itemCaption} - ${formattedItemDate}</p>

        <a target="_blank" 
           rel="noopener" 
           href="${itemInspectUrl}" 
           title="${chrome.i18n.getMessage("sites_list_inspect_link_tooltip")} ${entry.website.name}">
          <img src="../assets/magnifier.svg" 
               alt="${chrome.i18n.getMessage("sites_list_inspect_link_alt")}"/>
        </a>
      </li>`;
    };

    this.innerHTML = /*html*/`<ul>${listHTML}</ul>`;
  }
}
customElements.define('sites-list', SitesList);
