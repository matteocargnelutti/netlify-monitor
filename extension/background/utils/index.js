/**
 * netlify-monitor
 * @module background/utils/index
 * @author Matteo Cargnelutti
 * @license MIT
 * @description Centralizes imports for background-related utilities.
 */
import requestNetlifyToken from "./requestNetlifyToken.js";
import toggleNotifications from "./toggleNotifications.js";
import pullWebsitesFromNetlify from "./pullWebsitesFromNetlify.js";
import pullBuildsFromNetlify from "./pullBuildsFromNetlify.js";
import triggerFailedBuildAlerts from "./triggerFailedBuildAlerts.js";

/**
 * Background-related utility functions.
 *
 * Usage example:
 * ```
 * import { utils } from "./utils/index.js";
 * utils.toggleNotifications();
 * ```
 *
 * See details for each functions in `background.utils`.
 */
export const utils = {
  requestNetlifyToken,
  toggleNotifications,
  pullWebsitesFromNetlify,
  pullBuildsFromNetlify,
  triggerFailedBuildAlerts
};
