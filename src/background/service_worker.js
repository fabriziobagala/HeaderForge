import { convertToDNRRule, findAvailableRuleId } from '../utils/dnr-utils.js';

chrome.runtime.onStartup.addListener(initializeRules);
chrome.runtime.onInstalled.addListener(initializeRules);

/**
 * Initializes the dynamic rules for the Chrome extension.
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

    // Find a safe starting ID that doesn't conflict with Chrome's internal rules
    const idOffset = await findAvailableRuleId() - 1;  // Subtract 1 since we'll add it to our rule IDs that start at 1

    // Add enabled stored rules with calculated offset to avoid Chrome ID conflicts
    const enabledRules = storedRules.filter(rule => rule.enabled !== false);
    const dnrRules = enabledRules.map(rule => convertToDNRRule(rule, idOffset)).filter(Boolean);

    if (dnrRules.length > 0) {
        await chrome.declarativeNetRequest.updateDynamicRules({
            addRules: dnrRules
        });
    }

    // Store the current ID offset for future operations
    await chrome.storage.local.set({ ruleIdOffset: idOffset });
}
