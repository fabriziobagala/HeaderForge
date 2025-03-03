import { convertToDNRRule } from '../utils/dnr-utils.js';

chrome.runtime.onStartup.addListener(initializeRules);
chrome.runtime.onInstalled.addListener(initializeRules);

/**
 * Initializes the dynamic rules for the Chrome extension.
 * 
 * @async
 * @function initializeRules
 * @returns {Promise<void>} A promise that resolves when the rules have been initialized.
 */
async function initializeRules() {
    const data = await chrome.storage.local.get(['rules']);
    const storedRules = data.rules || [];

    // Clear existing dynamic rules
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const existingRuleIds = existingRules.map(rule => rule.id);
    if (existingRuleIds.length > 0) {
        await chrome.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: existingRuleIds
        });
    }

    // Add enabled stored rules
    const enabledRules = storedRules.filter(rule => rule.enabled !== false);
    const dnrRules = enabledRules.map(convertToDNRRule).filter(Boolean);

    if (dnrRules.length > 0) {
        await chrome.declarativeNetRequest.updateDynamicRules({
            addRules: dnrRules
        });
    }
}
