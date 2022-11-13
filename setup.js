/**
 * netlify-monitor
 * @module setup
 * @author Matteo Cargnelutti
 * @license MIT
 * @description Prepares project for development or release. Invoked through `npm run setup`.
 */
import fs from "node:fs";
import prompts from "prompts";
import zipdir from "zip-dir";

/**
 * [1] Pulls the latest version of Dexie.js into `/extension/lib.`
 * This is required because Chrome extensions do not allow embedding externally-sourced scripts.
 */
console.log("Pulling the latest version of Dexie.js ...");

const dexieSource = await fetch("https://unpkg.com/dexie@latest/dist/modern/dexie.mjs");
fs.writeFileSync("./extension/lib/dexie.mjs", await dexieSource.text());

console.log("- Ok.");

/**
 * [2] Asks for a Netlify Client ID.
 * This client ID is going to be used when requesting a Netlify access token on behalf of the user.
 */
console.log("Define Netlify Client ID to be used (see https://app.netlify.com/user/applications):");

const clientId = await prompts({
  type: "text",
  name: "value",
  message: "Netlify Client ID:",
  validate: (value) => {
    return value && value.length >= 43 ? true : "A valid client ID is at least 43 characters long."
  },
});

fs.writeFileSync(
  "./extension/constants/netlifyClientId.js",
  `export default "${clientId.value ? clientId.value : ""}"`
);

if (clientId.value) {
  console.log("- Ok.");
}
else {
  console.log("- Skipped. The extension won't be able to request a Netlify access token.");
}

/**
 * [3] Asks user if they want to generate a release ZIP
 */
console.log("Generate a zip file for the extension if needed.");
const wantsZip = await prompts({
  type: "confirm",
  name: "value",
  message: "Make a .zip file out of the `extension` folder?",
  initial: false
});

if (wantsZip.value === true) {
  const output = "./netlify-monitor.zip";
  await zipdir("./extension", { saveTo: output });
  console.log(`-- Saved to ${output}`);
}

