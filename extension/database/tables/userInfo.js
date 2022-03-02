/**
 * netlify-monitor
 * @module database/tables/userInfo
 * @author Matteo Cargnelutti
 * @license MIT
 * @description Data class and utility functions for the `userInfo` table.
 */
import { getDatabase } from '../index.js';

/**
 * Lists keys that can be used to store data in the `userInfo` table, and their associated type.
 * `UserInfo` uses this object to enforce key names checks and loose type casting.
 * There can only be 1 entry for a given key from list in the `userInfo` table.
 *
 * Keys detail:
 * - `netlifyAccessToken`: Access token returned by Netlify.
 * - `refreshInProgress`: Whether or not a fresh set data is currently being pulled in the background.
 * - `lastRefresh`: Indicates when data was pulled from the Netlify API for the last time.
 * - `userWantsNotifications`: Indicates whether or not the user wants notifications for failed builds.
 * 
 * @constant
 */
export const KEYS = {
  netlifyAccessToken: String,
  refreshInProgress: Boolean,
  lastRefresh: Date,
  userWantsNotifications: Boolean
};

/**
 * Describes the indexes used by the `userInfo` table. 
 * See Dexie's documentation: https://dexie.org/docs/Version/Version.stores()#schema-syntax
 * @constant
 */
export const INDEXES = "&key";

/**
 * Data class for the "userInfo" database store. Represent a single piece of user information.
 */
export class UserInfo {
  /** 
   * Key used as an index to store this piece of user information.
   * Must be a key of `shared.database.userInfo.KEYS`
   * @type {string} 
   */
  key;

  /** 
   * Value associated with this entry.
   * @type {?any} 
   */
  value = null;

  /** 
   * Saves the current `UserInfo` entry in the database.
   * - If an entry already exists for the current key, the record will be replaced.
   * - `UserInfo.value`'s type based on the value provided by `KEYS`.
   * 
   * @returns {Promise}
   */
  save() {
    const validKeys = Object.keys(KEYS);

    if (!this.key || typeof this.key !== 'string') {
      throw new Error(`UserInfo.key is required and must be a string.`);
    }

    if (!validKeys.includes(this.key)) {
      throw new Error(`"${this.key}" is not a valid value for UserInfo.key. Can be: ${validKeys.join(', ')}`)
    }

    if (KEYS[this.key] === Boolean) {
      this.value = this.value ? true : false;
    }

    if (KEYS[this.key] === Number) {
      this.value = Number(this.value);
    }

    if (KEYS[this.key] === Date) {
      if (this.value instanceof Date !== true) {
        this.value = Date(this.value);
      }
    }

    if (KEYS[this.key] === String && this.value !== undefined && this.value !== null) {
      this.value = String(this.value);
    }    

    return getTable().put(this, "key");
  }

}

/**
 * Returns a reference to the `userInfo` table from the database.
 * @returns {Dexie.Table}
 */
export function getTable() {
  return getDatabase().userInfo;
}

/**
 * Returns all entries from the `userInfo` table.
 * @returns {Promise<UserInfo[]>}
 * @async
 */
export async function getAll() {
  return await getTable().toArray();
}

/**
 * Return a specific entry from user entry by key.
 * @param {string} key - Must be a key of `shared.database.userInfo.KEYS`
 * @returns {Promise<UserInfo>}
 * @async
 */
export async function getByKey(key) {
  return await getTable().get(key);
}

/**
 * Clears the `userInfo` table.
 * @returns {Promise} 
 * @async
 */
export async function clearAll() {
  return await getTable().clear();
}

/**
 * Creates or updates a single entry in the `userInfo` table.
 * @param {string} key - Must be a key of `shared.database.userInfo.KEYS`.
 * @param {any} value 
 * @returns {Promise}
 * @async
 */
export async function updateEntry(key, value) {
  let entry = new UserInfo();
  entry.key = key;
  entry.value = value;
  return await entry.save();
}
