/**
 * netlify-monitor
 * @module background/utils/toggleNotifications
 * @author Matteo Cargnelutti
 * @license MIT
 * @description Utility for toggling user notification preferences on/off.
 */
import { database } from '../../database/index.js';
import { UserInfo } from '../../database/tables/userInfo.js';

/**
 * "Toggles" the value of `userWantsNotifications` in the `userInfo` table.
 * Will create that entry if necessary.
 * 
 * @returns {Promise<UserInfo>}
 */
export default async function() {
  const key = "userWantsNotifications";
  let entry = await database.userInfo.getByKey(key);
  let newValue = true; // Default.

  // Flip existing value if one already exists.
  if (entry instanceof UserInfo) {
    newValue = entry.value === true ? false : true;
  }

  return await database.userInfo.updateEntry(key, newValue);
}
