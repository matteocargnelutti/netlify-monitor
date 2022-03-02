/**
 * netlify-monitor
 * @module database/tables/builds
 * @author Matteo Cargnelutti
 * @license MIT
 * @description Data class and utility functions for the `builds` table.
 */
import { getDatabase } from '../index.js';

/**
 * Describes the indexes used by the `builds` table. 
 * See Dexie's documentation: https://dexie.org/docs/Version/Version.stores()#schema-syntax
 * @constant
 */
export const INDEXES = "&buildId, siteId, createdAt";

/**
 * Data class for the `builds` table. Represents a single website build.
 */
export class Build {
  /**
   * Unique identifier of this build, as provided by Netlify.
   * @type {string}
   */
  buildId;

  /**
   * Unique identifier of the website associated with this build, as provided by Netlify.
   * @type {string}
   */
  siteId;

  /**
   * Unique identifier of the deploy associated with this build, as provided by Netlify.
   * @type {?string}
   */
  deployId = null;

  /**
   * Indicates whether or not this build is completed.
   * @type {boolean}
   */
  isDone = false;

  /**
   * Indicates whether or not this build has failed.
   * @type {boolean}
   */
  hasFailed = false;

  /**
   * Indicated whether or not this build has been considered for an alert.
   * If `true`, it won't be considered a second time.
   * @type {boolean}
   */
  consideredForAlert = false;

  /**
   * Date at which this build was created.
   * @type {?Date}
   */
  createdAt = null;

  /**
   * Saves the current `Build` entry in the database.
   * - If an entry already exists for this `buildId`, the record will be replaced.
   * - Only `buildId` and `siteId` are mandatory.
   * - Other values will be loosely checked: they will be replaced by `null` or `false` if the type doesn't match.
   *
   * @returns {Promise}
   */
  save() {
    if (!this.buildId || typeof this.buildId !== "string") {
      throw new Error(`Build.buildId is required and must be a string.`);
    }

    if (!this.siteId || typeof this.siteId !== "string") {
      throw new Error(`Build.siteId is required and must be a string.`);
    }

    this.deployId = (typeof this.deployId === 'string' && this.deployId) ? this.deployId : null;
    this.isDone = this.isDone === true ? true : false;
    this.hasFailed = this.hasFailed === true ? true : false;
    this.consideredForAlert = this.consideredForAlert === true ? true : false;
    this.createdAt = this.createdAt instanceof Date ? this.createdAt : null;

    return getTable().put(this, "buildId");
  }
}

/**
 * Returns a reference to the `builds` table from the database.
 * @returns {Dexie.Table}
 */
export function getTable() {
  return getDatabase().builds;
}

/**
 * Returns all entries from the `builds` table.
 * @returns {Promise<Build[]>} 
 * @async 
 */
export async function getAll() {
  return await getTable().toArray();
}

/**
 * Returns all entries from the past X hours from the `builds` table.
 * Uses "createdAt" as a filter.
 * 
 * @param {number} hours 
 * @returns {Promise<Build[]>} 
 * @async 
 */
export async function getAllForPeriod(hours) {
  let before = new Date();
  before.setHours(before.getHours() - Number(hours));
  before = new Date(before);

  return await getTable().where("createdAt").above(before).toArray();
}

/**
 * Clears the `builds` table.
 * @returns {Promise} 
 * @async
 */
export async function clearAll() {
  return await getTable().clear();
}

/**
 * Deletes all builds for a given `siteId`
 * @param {string} siteId - Website identifier, as provided by Netlify.
 * @returns {Promis}
 * @async
 */
export async function clearAllForSiteId(siteId) {
  return await getTable().where({siteId: siteId}).delete();
}

/**
 * Fetches a build by `buildId`. 
 * @param {string} buildId - Build identifier, as provided by Netlify.
 * @returns {Promise<?Build>}
 * @async
 */
export async function getByBuildId(buildId) {
  return await getTable().get(buildId);
}

/**
 * Fetches builds by `siteId`, ordered by `createdAt` (desc). 
 * @param {string} siteId - Website identifier, as provided by Netlify.
 * @returns {Promise<?Build[]>}
 * @async
 */
export async function getBySiteId(siteId) {
  return await getTable().where({siteId: siteId}).reverse().sortBy('createdAt');
}

/**
 * Creates / updates multiple entries at once (saves transactions).
 * Filters-out entries that are not instances of `Build`.
 * 
 * @param {Build[]}
 * @return {Promise}
 */
export async function bulkSave(builds) {
  builds = builds.filter(build => build instanceof Build);
  return await getTable().bulkPut(builds);
}
