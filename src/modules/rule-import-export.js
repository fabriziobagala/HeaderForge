import { state } from '../popup.js';
import { convertToDNRRule } from '../utils/dnr-utils.js';
import { loadRules } from './rule-manager.js';

/**
 * Checks if two rules are equivalent by comparing their URL patterns and headers.
 * Used to prevent duplicate rules during import and save operations.
 * 
 * @param {Object} rule1 - First rule to compare
 * @param {Object} rule2 - Second rule to compare
 * @returns {boolean} Whether the two rules match in pattern and headers
 */
export function areRulesEquivalent(rule1, rule2) {
    // First check URL patterns
    if (rule1.urlPattern !== rule2.urlPattern) {
        return false;
    }

    // Then check header count
    if (rule1.headers.length !== rule2.headers.length) {
        return false;
    }

    // Finally do deep comparison of headers
    // Sort headers for consistent comparison regardless of order
    const sorted1 = [...rule1.headers].sort((a, b) => a.name.localeCompare(b.name));
    const sorted2 = [...rule2.headers].sort((a, b) => a.name.localeCompare(b.name));

    return sorted1.every((h, idx) =>
        h.operation === sorted2[idx].operation &&
        h.name === sorted2[idx].name &&
        h.value === sorted2[idx].value
    );
}

/**
 * Exports rules as a JSON file.
 * Creates a Blob and triggers a file download with timestamp in the filename.
 */
export async function exportRules() {
    try {
        const { rules = [] } = await chrome.storage.local.get(['rules']);

        // Create export data structure with metadata
        const exportData = {
            timestamp: new Date().toISOString(),
            version: "1.0",
            rules
        };

        // Create and trigger download
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;

        // Format date string for filename
        const formattedDate = new Date().toISOString()
            .replace(/[:.]/g, '-')
            .replace('T', '_')
            .split('.')[0];
        a.download = `headerforge-${formattedDate}.json`;

        // Programmatically trigger download and clean up
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (error) {
        alert('Failed to export rules. Please try again.');
    }
}

/**
 * Imports rules from a JSON file.
 * Validates the file format and merges only unique new rules.
 * 
 * @param {Event} event - The change event from the file input
 */
export async function importRules(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
        // Read and parse the file
        const text = await file.text();
        const importedData = JSON.parse(text);

        // Validate file structure
        if (!importedData.rules || !Array.isArray(importedData.rules)) {
            throw new Error('Invalid file format: missing rules array');
        }

        // Check against Chrome's rule limit
        const { rules: currentRules = [] } = await chrome.storage.local.get(['rules', 'nextRuleId']);
        if (currentRules.length + importedData.rules.length > chrome.declarativeNetRequest.MAX_NUMBER_OF_DYNAMIC_RULES) {
            throw new Error(`Import would exceed the maximum limit of ${chrome.declarativeNetRequest.MAX_NUMBER_OF_DYNAMIC_RULES} rules`);
        }

        // Validate structure for every imported rule
        importedData.rules.forEach((rule, idx) => {
            if (!rule.urlPattern || !rule.headers || !Array.isArray(rule.headers)) {
                throw new Error(`Invalid rule at index ${idx}: missing required properties`);
            }
        });

        // Process rules and filter duplicates
        const uniqueNewRules = [];
        const duplicateRules = [];

        // Calculate next rule ID to use
        let nextRuleId = currentRules.length > 0
            ? Math.max(...currentRules.map(r => r.id)) + 1
            : state.INITIAL_RULE_ID;

        // Filter duplicates and assign new IDs to unique rules
        for (const importedRule of importedData.rules) {
            const isDuplicate = currentRules.some(existingRule =>
                areRulesEquivalent(importedRule, existingRule)
            );
            if (!isDuplicate) {
                uniqueNewRules.push({ ...importedRule, id: nextRuleId++ });
            } else {
                duplicateRules.push(importedRule);
            }
        }

        // Save unique rules if any found
        if (uniqueNewRules.length > 0) {
            const updatedRules = [...currentRules, ...uniqueNewRules];
            await chrome.storage.local.set({ rules: updatedRules, nextRuleId });

            // Update Chrome's declarativeNetRequest with new rules
            const dnrRules = uniqueNewRules.map(convertToDNRRule);
            await chrome.declarativeNetRequest.updateDynamicRules({ addRules: dnrRules });
            await loadRules();
        }

        // Reset file input and show import summary
        event.target.value = '';
        alert(`Import summary:\n- ${uniqueNewRules.length} new rules imported\n- ${duplicateRules.length} duplicate rules skipped`);
    } catch (error) {
        alert(`Failed to import rules: ${error.message}`);
        event.target.value = '';
    }
}
