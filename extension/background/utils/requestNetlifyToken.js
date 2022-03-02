/**
 * netlify-monitor
 * @module background/utils/requestNetlifyToken
 * @author Matteo Cargnelutti
 * @license MIT
 * @description Utility for requesting and managing an OAuth token from Netlify.
 */
import { MESSAGE_IDS, NETLIFY_CLIENT_ID } from "../../constants/index.js";
import { database } from '../../database/index.js';

/**
 * Uses the Chrome identity API to send an authorization request to Netlify.
 * - Clears the access token currently stored in the database, if any.
 * - Generates an authorization url and opens a web view using it.
 * - Captures the token returned in the url Netlify redirected to after authorization.
 * - Stores the token in the `userInfo` table.
 * 
 *
 * See detail of message types and storage keys in `constants`.
 *
 * @returns {Promise<string>} The access token, if granted.
 * @async 
 */
export default async function() {
  // Clear Netlify access token from storage, if any.
  await database.userInfo.updateEntry('netlifyAccessToken', null);

  // Single-use "state" value to help prevent CSRF.
  // See: https://tools.ietf.org/id/draft-ietf-oauth-security-topics-13.html#rfc.section.3.1
  const state = String(Math.random());

  // Prepare authorization request url.
  const requestParams = new URLSearchParams();
  requestParams.append("client_id", NETLIFY_CLIENT_ID);
  requestParams.append("response_type", "token");
  requestParams.append("redirect_uri", chrome.identity.getRedirectURL());
  requestParams.append("state", state);

  // Open web view to request authorization, wait for token to come back via return url.
  // Redirect mechanism explained here:
  // - https://developer.chrome.com/docs/extensions/reference/identity/#method-launchWebAuthFlow
  const response = await new Promise((resolve, reject) => {
    chrome.identity.launchWebAuthFlow(
      {
        url: `https://app.netlify.com/authorize?${requestParams.toString()}`,
        interactive: true,
      },
      function (response) {
        response ? resolve(response) : reject("No url returned.");
      }
    );
  });

  // Out of the authorization process flow, we get a full url.
  // We are only interested in the query parameters nested in it's hash.
  const responseParams = new URLSearchParams(
    new URL(response).hash.substring(1)
  );

  // CSRF Check: the url returned by Netlify must contain the same `state` value it was given.
  if (responseParams.get("state") !== state) {
    throw new Error(
      `"state" parameter returned does not match what was sent to Netlify.`
    );
  }

  // Access tokens are SHA digests in base64. Their length can therefore be assumed.
  if (
    !responseParams.get("access_token") ||
    responseParams.get("access_token").length < 43
  ) {
    throw new Error(`No "access_token" returned in url.`);
  }

  // Store and return token.
  let token = responseParams.get("access_token");
  await database.userInfo.updateEntry("netlifyAccessToken", token);
  return token;
}
