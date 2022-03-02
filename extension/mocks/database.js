/**
 * netlify-monitor
 * @module mocks/database
 * @author Matteo Cargnelutti
 * @license MIT
 * @description Utility functions to populate the database with mock data. Written for us in a browser context.
 */
import { database } from "../database/index.js"
import { Build } from "../database/tables/builds.js";
import { UserInfo } from "../database/tables/userInfo.js";
import { Website } from "../database/tables/websites.js";

/**
 * Populates the database with mock data for all the possible entries for the `userInfo` table.
 * 
 * Automatically clears the `userInfo` table before creating new entries.
 * 
 * See `extension.database.table.userInfo.KEYS` for details about the possible entries of `userInfo`.
 * 
 * @returns {Promise<boolean>}
 * @async
 */
export async function mockUserInfo(
  toSave = {
    netlifyAccessToken: "mock-netlify-access-token-123456ABCDEFGHIJK",
    refreshInProgress: false,
    lastRefresh: new Date(),
    userWantsNotifications: false
  }
) {
  await database.userInfo.clearAll();

  for (let [key, value] of Object.entries(toSave)) {
    const info = new UserInfo();
    info.key = key;
    info.value = value;
    await info.save();
  }

  return true;
}

/**
 * Generates and stores mock data in the database for X websites and associated builds. 
 * 
 * Automatically clears the `websites` and `builds` tables before creating new entries.
 * 
 * @param {number=10} total - Number of websites and associated builds to generate. Must be between 1 and 1000.
 * @param {number=1} pendingBuilds - Determines how many builds should be marked as pending.
 * @param {number=1} failedBuilds  - Determines how many builds should be marked as failed.
 * @returns {Promise<boolean>}
 * @async
 */
export async function mockWebsitesAndBuilds(
  total = 10,
  pendingBuilds = 1,
  failedBuilds = 1
) {
  const websites = await mockWebsites(total, pendingBuilds + failedBuilds);
  await mockBuilds(websites, pendingBuilds, failedBuilds);
  return true;
}

/**
 * Generates and stores mock data in the database for X websites. 
 * 
 * Automatically clears the `websites` table before creating new entries.
 * 
 * @param {number=10} total - Number of websites to generate. Must be between 1 and 1000.
 * @param {number=1} updatedRecently - Determines how many of these websites should have their "lastUpdate" field set to a recent point in time (an hour ago).
 * @returns {Promise<Website[]>}
 * @async
 */
export async function mockWebsites(total = 10, updatedRecently = 1) {

  await database.websites.clearAll();

  total = parseInt(total);
  updatedRecently = parseInt(updatedRecently);

  if (isNaN(total) || total < 1 || total > 1000) {
    throw new Error(`"total" must be a number between 1 and 100.`);
  }

  if (isNaN(updatedRecently) || updatedRecently > total) {
    throw new Error(`"updatedRecently" must be a number between zero and ${total}.`);
  }

  let websites = [];

  for (let i = 0; i < total; i++) {
    let site = new Website();
    websites.push(site);

    site.siteId = window.crypto.randomUUID();
    site.url = `https://${site.siteId}.netlify.app`;
    site.name = `Website ${site.siteId.split("-")[0]}`;
    site.lastUpdate = new Date();

    // If `updatedRecently` is > 0, pretend this website was updated in the last hour.
    if (updatedRecently > 0) {
      site.lastUpdate = new Date(
        site.lastUpdate.setHours(site.lastUpdate.getHours() - 1)
      );
      updatedRecently -= 1;
    } 
    else {
      site.lastUpdate = new Date(
        site.lastUpdate.setHours(site.lastUpdate.getHours() - 24 * i)
      );
    }

  }

  await database.websites.bulkSave(websites);

  return websites;
}

/**
 * Generates and stores mock data in the database for X builds. 
 * 
 * Automatically clears the `builds` table before creating new entries.
 * 
 * @param {Website[]} websites - Preferably generated using `mockWebsites()`.
 * @param {number=1} pending - Determines how many builds should be marked as pending.
 * @param {number=1} failed - Determines how many builds should be marked as failed.
 * @returns {Promise<Build[]>}
 */
export async function mockBuilds(websites, pending = 1, failed = 1) {

  await database.builds.clearAll();

  pending = parseInt(pending);
  failed = parseInt(failed);

  if (websites.length < 1 || websites[0] instanceof Website !== true) {
    throw new Error(`"websites" must be an array of Website objects.`);
  }

  if(isNaN(pending) || pending < 0 || pending > websites.length) {
    throw new Error(`"pending" must be a number between 0 and the total of websites.`);
  }

  if (isNaN(failed) || failed < 0 || failed > websites.length) {
    throw new Error(`"failed" must be a number between 0 and the total of websites.`);
  }

  let builds = [];

  for (let site of websites) {

    let build = new Build();
    builds.push(build);

    build.siteId = site.siteId;
    build.buildId = window.crypto.randomUUID();
    build.consideredForAlert = false;
    build.createdAt = site.lastUpdate;
    build.isDone = true;
    build.hasFailed = false;

    // If there are still builds to marks as "pending".
    if (pending > 0) {
      build.isDone = false;

      pending -= 1;
      continue;
    }
    // If there are still builds to mark as "failed". 
    if (failed > 0) {
      build.isDone = true;
      build.hasFailed = true;
      build.deployId = window.crypto.randomUUID();

      failed -= 1;
      continue;
    }

  }

  await database.builds.bulkSave(builds);

  return builds;
}
