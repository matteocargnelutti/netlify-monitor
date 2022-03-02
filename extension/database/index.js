/**
 * netlify-monitor
 * @module database/index
 * @author Matteo Cargnelutti
 * @license MIT
 * @description Entry point for the shared database module. Uses Dexie to define and manage IndexedDB tables.
 */
import Dexie from "../lib/dexie.mjs";
import { DATABASE_NAME } from "../constants/index.js";
import * as userInfo from "./tables/userInfo.js";
import * as websites from "./tables/websites.js";
import * as builds from "./tables/builds.js";

/**
 * Local reference to a database instance.
 */
let dbRef = null;

/**
 * Returns a Dexie database instance, initialized using the app's schema.
 * Uses a module-level reference to prevent unnecessary duplicate connections. 
 *
 * See `shared.database.tables` for details about each table.
 *
 * @param {string} databaseName - If not given, `shared.constants.DATABASE_NAME` will be used by default.
 * @returns {Dexie} Database instance.
 */
export function getDatabase(databaseName = DATABASE_NAME) {
  // Only create a new instance if needed.
  if (dbRef) {
    return dbRef;
  }

  dbRef = new Dexie(databaseName);

  // Create stores and associated indexes.
  dbRef.version(1).stores({
    userInfo: userInfo.INDEXES,
    websites: websites.INDEXES,
    builds: builds.INDEXES,
  });

  // Map tables to data classes.
  // This allows Dexie to return instances of these classes when pulling data out of the IndexedDB.
  dbRef.userInfo.mapToClass(userInfo.UserInfo);
  dbRef.websites.mapToClass(websites.Website);
  dbRef.builds.mapToClass(builds.Build);

  return dbRef;
}

/**
 * Deletes a given Dexie-managed IndexedDB.
 * Will also clear out module-level reference to the database. 
 *
 * @param {string} databaseName - If not given, `shared.constants.DATABASE_NAME` will be used by default.
 * @returns {Promise<void>}
 * @async 
 */
export async function deleteDatabase(databaseName = DATABASE_NAME) {
  dbRef = null;

  try {
    return await Dexie.delete(databaseName);
  }
  catch (err) {
    console.log(`Database ${DATABASE_NAME} could not be deleted.`);
  }
}

/**
 * Reference to individual table modules, containing data classes and functions to help work with database tables.
 * 
 * These modules automatically connect to the app's database.
 * 
 * Usage example:
 * ```
 * import { database } from './database/index.js';
 * 
 * // Using a utility function
 * const websites = await database.websites.getAll();
 * 
 * // Direct access to the database table (`Dexie.Table` reference)
 * const table = database.websites.getTable();
 * ```
 * 
 * See `shared.database.tables` for more information about each table.
 */
export const database = {
  userInfo,
  websites,
  builds,
};
