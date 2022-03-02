/**
 * netlify-monitor
 * @module mocks/chrome
 * @author Matteo Cargnelutti
 * @license MIT
 * @description Utility functions to mock Chrome features that are only available in the context of an extension.
 */
import { MESSAGE_IDS } from "../constants/index.js";

/**
 * Partially mocks the `chrome.runtime.sendMessage()` function.
 * If the message format and content matches the standard used by the extension, prints it out in the console.
 * 
 * See `constants.MESSAGE_IDS` for the full list of possible messages.
 * 
 * @param {Object} message - {messageId: VALUE}, based on `constants.MESSAGE_IDS`
 */
export function runtimeSendMessage(message) {

  if (typeof message !== "object") {
    return;
  }

  // Get the key associated to the message value.
  let messageKey = null;

  for (let [key, value] of Object.entries(MESSAGE_IDS)) {
    if(value === message.messageId) {
      messageKey = key;
      break;
    }
  }

  if (messageKey) {
    console.log(`Incoming runtime message: ${messageKey}`);
  }
}


/**
 * Partially mocks the `chrome.action.setBadgeText()` function.
 * @param {any} newValue 
 * @returns {Promise<boolean>}
 */
export async function actionSetBadgeText(newValue) {
  console.log("The following was passed to chrome.action.setBadgeText:", newValue);
  return true;
}

/**
 * Partially mocks the `chrome.i18n.getMessage()` function.
 * Will fetch and parse the i18n file for the current locale, and return the copy associated to the key passed as an argument, if any.
 * 
 * Important: Call "i18nMockSetup()" once before using this mock, so copy is available at module level.
 * 
 * @param {string} messagename - Key to a single copy entry in "message.json".
 * @returns {string} If available, the copy associated to "messagename".
 */
export function i18nGetMessage(messagename) {
  if (i18nCopy[messagename]) {
    return i18nCopy[messagename].message;
  }

  return messagename;
}

/**
 * Module-level "cache" of i18n copy content for the current locale.
 */
let i18nCopy = null;

/**
 * Loads contents of "message.json" for the current locale in a module-level variable, so it can be accessed by `i18nGetMessage()`.
 * 
 * @param {boolean=true} fromProjectRoot - If `true`, will append "/extension" to the beginning of the path for the file to fetch.
 * @async
 */
export async function i18nMockSetup(fromProjectRoot = true) {
  const locale = navigator.language.substring(0, 2);

  try {
    i18nCopy = await fetch(`${fromProjectRoot ? "/extension" : ""}/_locales/${locale}/messages.json`);
  }
  // Fallback to english
  catch(err) {
    i18nCopy = await fetch(`${fromProjectRoot ? "/extension" : ""}/_locales/en/messages.json`);
  }

  i18nCopy = await i18nCopy.json();
}
