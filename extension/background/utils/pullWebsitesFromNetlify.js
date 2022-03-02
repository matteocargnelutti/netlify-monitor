/**
 * netlify-monitor
 * @module background/utils/pullWebsitesFromNetlify
 * @author Matteo Cargnelutti
 * @license MIT
 * @description Utility for pulling and storing a list of websites from the Netlify API.
 */
import { database } from "../../database/index.js";
import { Website } from "../../database/tables/websites.js";

/**
 * Pulls and stores the full list of websites deployed on Netlify for the current user.
 * Data is stored in the `websites` table of the database.
 * 
 * API Docs: https://open-api.netlify.com/#operation/listSites
 *
 * @param {string} netlifyAccessToken - OAuth access token for the Netlify API.
 * @returns {Promise<number>} Total of websites saved in the database.
 * @async
 */
export default async function(netlifyAccessToken) {
  // Pull list of websites from the Netlify API.
  const url = "https://api.netlify.com/api/v1/sites?page=1&per_page=1000";
  const headers = { Authorization: `Bearer ${netlifyAccessToken}` };
  let response = await fetch(url, { headers });

  if (response.status !== 200) {
    throw new Error(
      `Could not list websites for the current user on Netlify. Status code: ${response.status}.`
    );
  }

  // Clear the `websites` table and save all entries from response.
  database.websites.clearAll();

  let websites = [];

  for (let website of await response.json()) {
    try {
      let entry = new Website();
      entry.siteId = website.id;
      entry.name = website.name;
      entry.url = website.url;
      entry.lastUpdate = new Date(website.updated_at);

      websites.push(entry);
    } 
    catch (err) {
      console.log(`Error while saving details for the "${website.name}" website in the database.`);
      console.log(err);
    }
  }

  await database.websites.bulkSave(websites);
  return websites.length;
}