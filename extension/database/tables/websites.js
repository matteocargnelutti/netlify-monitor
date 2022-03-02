/**
 * netlify-monitor
 * @module database/tables/userInfo
 * @author Matteo Cargnelutti
 * @license MIT
 * @description Data class and utility functions for the `websites` table.
 */
import { getDatabase } from '../index.js';

/**
 * Describes the indexes used by the `websites` table. 
 * See Dexie's documentation: https://dexie.org/docs/Version/Version.stores()#schema-syntax
 * @constant
 */
export const INDEXES = "&siteId, lastUpdate";

/**
 * Data class for the `websites` table. Represents a single website.
 */
export class Website {
  /**
   * Unique identifier of the website associated with this build, as provided by Netlify.
   * @type {string}
   */
  siteId = null;

  /**
   * Website name, as provided by Netlify.
   * @type {?string}
   */
  name = null;

  /**
   * Website url, as provided by Netlify.
   * @type {?string}
   */
  url = null;

  /**
   * Date at which the website was updated for the last time, as provided by Netlify.
   * @type {?Date}
   */
  lastUpdate = null;

  /**
   * Saves the current `Website` entry in the database.
   * - If an entry already exists for this `siteId`, the record will be replaced.
   * - Only `siteId` is mandatory.
   *
   * @returns {Promise}
   */
  save() {
    if (!this.siteId || typeof this.siteId !== 'string') {
      throw new Error(`Website.siteId is required and must be a string.`);
    }

    this.name = (typeof this.name === 'string' && this.name) ? this.name : null;
    this.url = (typeof this.url === 'string' && this.url) ? this.url : null;
    this.lastUpdate = this.lastUpdate instanceof Date ? this.lastUpdate : null;

    return getTable().put(this, 'siteId');
  }
}

/**
 * Returns a reference to the `websites` table from the database.
 * @returns {Dexie.Table}
 */
export function getTable() {
  return getDatabase().websites;
}

/**
 * Returns all entries from the `websites` table.
 * @param {boolean} lastUpdatedFirst - If `true`, will return entries sorted by "lastUpdated" (desc)
 * @returns {Promise<Website[]>} 
 * @async 
 */
export async function getAll(lastUpdatedFirst = false) {
  if (lastUpdatedFirst) {
    return await getTable().orderBy("lastUpdate").reverse().toArray();
  } 
  else {
    return await getTable().toArray();
  }
}


/**
 * Returns a count of all entries in the `website` table.
 * @returns {Promise<Number>}
 * @async
 */
export async function getCount() {
  return await getTable().count();
}

/**
 * Clears the `website` table.
 * @returns {Promise} 
 * @async
 */
export async function clearAll() {
  return await getTable().clear();
}

/**
 * Fetches a website by `siteId`. 
 * @param {string} siteId - Website identifier, as provided by Netlify.
 * @returns {Promise<?Website>}
 * @async
 */
export async function getBySiteId(siteId) {
  return await getTable().get(siteId);
}

/**
 * Creates / updates multiple entries at once (saves transactions).
 * Filters-out entries that are not instances of `Website`.
 * 
 * @param {Website[]}
 * @return {Promise}
 */
export async function bulkSave(websites) {
  websites = websites.filter(website => website instanceof Website);
  return await getTable().bulkPut(websites);
}
