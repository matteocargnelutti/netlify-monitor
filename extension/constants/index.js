/**
 * netlify-monitor
 * @module constants/index
 * @author Matteo Cargnelutti
 * @license MIT
 * @description Constants to be consumed app-wide.
 */
import netlifyClientId from "./netlifyClientId.js";

/**
 * OAuth public client id to be used to request access to the Netlify API on behalf of the user.
 * @constant
 */
export const NETLIFY_CLIENT_ID = netlifyClientId;

/**
 * Identifiers for the runtime messages sent and caught via `chrome.runtime`.
 * These messages are used to communicate between the different parts of the extension.
 * These are meant to be passed as `messageId`.
 * 
 * Usage example:
 * ```
 * import { MESSAGE_IDS } from './constants/index.js'
 * 
 * // Sending a message
 * chrome.runtime.sendMessage({
 *  messageId: MESSAGE_IDS.NETLIFY_AUTH_REQUEST
 * });
 * 
 * // Receiving a message
 * chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
 *   if (request.messageId === MESSAGE_IDS.NETLIFY_AUTH_REQUEST) {
 *     // Code for handling a netlify authentication request.
 *   }
 * });
 * ```
 * 
 * Message identifiers detail:
 * - `NETLIFY_AUTH_REQUEST`: Fired when the user requests access to the Netlify API.
 * - `REFRESH_REQUEST`: User manually requested a full data refresh.
 * - `CLEAR_ALL_REQUEST`: User requested that all their data stored locally were cleared. 
 * - `TOGGLE_NOTIFICATIONS_REQUEST`: User switched their notification preferences between "on" and "off".
 * 
 * @constant
 */
export const MESSAGE_IDS = {
  NETLIFY_AUTH_REQUEST: 1,
  REFRESH_REQUEST: 2,
  CLEAR_ALL_REQUEST: 3,
  TOGGLE_NOTIFICATIONS_REQUEST: 4
};


/**
 * Default name to be used by the IndexedDB managed via Dexie. 
 * See `shared.database`. 
 * @constant
 */
export const DATABASE_NAME = 'NetlifyMonitorDb';
