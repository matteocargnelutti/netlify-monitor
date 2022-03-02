/**
 * netlify-monitor
 * @module background/utils/pullBuildsFromNetlify
 * @author Matteo Cargnelutti
 * @license MIT
 * @description Utility for pulling and storing a list of builds from the Netlify API.
 */
import { database } from "../../database/index.js";
import { Build } from "../../database/tables/builds.js";

/**
 * Pulls and stores information from Netlify about the latest build of websites that recently "changed".
 * 
 * We consider that an entry from the `websites` table recently changed if, either:
 * - Its `lastUpdate` field holds a date from less than two hours ago.
 * - It has no associated build in the `builds` table.
 * 
 * Notes:
 * - Builds are pulled from the Netlify API in parallel, in group of up to 100 requests. 
 * - A 60 second delay is observed after each block of 100 requests to avoid hitting rate limits.
 *
 * @param {string} netlifyAccessToken - OAuth access token for the Netlify API.
 * @returns {Promise<boolean>} `false` if any error occurred while pulling build details. 
 * @async
 */
export default async function(netlifyAccessToken) {
  //
  // Determine for which websites we need to pull the latest build.
  //
  const siteIdsToCheck = {};

  for (let website of await database.websites.getAll()) {
    // Website has "changed" in the past 2 hours
    const now = Number(new Date());
    const twoHours = 60 * 60 * 2 * 1000;
    if (now - Number(website.lastUpdate) <= twoHours) {
      siteIdsToCheck[website.siteId] = true;
      continue;
    }

    // Website has no build in store
    const latestBuilds = await database.builds.getBySiteId(website.siteId);
    if (latestBuilds.length === 0) {
      siteIdsToCheck[website.siteId] = true;
      continue;
    }

  }

  //
  // Pull the latest build from the Netlify API for filtered sites.
  //
  // Strategy: 
  // - Run up to 100 requests in parallel
  // - Add a 60 seconds delay after each batch of 100 requests to avoid hitting rate limit (200 request per minute).
  let batchesOfSiteIds = splitArrayInChunks(Object.keys(siteIdsToCheck), 100);
  let errorCount = 0;
  
  for (let i in batchesOfSiteIds) {
    let batch = batchesOfSiteIds[i];

    try {
      let builds = await Promise.all(
        batch.map(siteId => pullLatestBuild(netlifyAccessToken, siteId))
      );

      await database.builds.bulkSave(builds);

      // If there is another batch to process, add a delay to avoid hitting the API rate limit.
      if (i < batchesOfSiteIds.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 60 * 1000));
      }
    } 
    catch (err) {
      errorCount += 1;
      console.log(err);
    }
  }

  return errorCount === 0;
}

/**
 * Pulls the latest build for a given `siteId` from the Netlify API.
 * Returns a `Build` object ready to be stored in the database.
 * 
 * API Docs: https://open-api.netlify.com/#operation/listSiteBuilds
 *
 * @param {string} netlifyAccessToken - OAuth access token for the Netlify API.
 * @param {string} siteId
 * @returns {Promise<Build>}
 * @async
*/
async function pullLatestBuild(netlifyAccessToken, siteId) {
  //
  // Pull list of builds for the current `siteId` from the Netlify API
  //
  const url = `https://api.netlify.com/api/v1/sites/${siteId}/builds?page=1&per_page=1`;
  const headers = { Authorization: `Bearer ${netlifyAccessToken}` };
  let response = await fetch(url, { headers });

  if (response.status !== 200) {
    throw new Error(
      `Could not list builds for "${siteId}" on Netlify. Status code: ${response.status}.`
    );
  }

  response = await response.json();

  if (response.length === 0) {
    return;
  }

  // 
  // Store 
  //
  let buildFromApi = response[0];
  let buildFromDb = await database.builds.getByBuildId(buildFromApi.id);

  if (!buildFromDb) {
    buildFromDb = new Build(); 
    buildFromDb.buildId = buildFromApi.id;
    buildFromDb.siteId = siteId;
    buildFromDb.createdAt = new Date(buildFromApi.created_at);
  }

  buildFromDb.isDone = buildFromApi.done;
  buildFromDb.hasFailed = buildFromApi.error !== null ? true : false;
  buildFromDb.deployId = buildFromApi.deploy_id;

  return buildFromDb;
}

/**
 * Splits an array into chunks of a given maximum length.
 * @param {array} arrayToSplit 
 * @param {number} maxLength 
 * @returns {array[any]} New array made of `maxLength`-long chunks from `arrayToSplit`.
 */
function splitArrayInChunks(arrayToSplit, maxLength) {
  const chunks = [[]]; 
  let currentChunk = chunks[0];

  for (let value of arrayToSplit) {
    if (currentChunk.length >= maxLength) {
      const newChunk = [];
      chunks.push(newChunk);
      currentChunk = newChunk;
    }

    currentChunk.push(value);
  }

  return chunks;
}