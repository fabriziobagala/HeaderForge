/**
 * Finds the next available rule ID that doesn't conflict with existing Chrome rules
 * 
 * @async
 * @returns {Promise<number>} The next available rule ID
 */
export async function findAvailableRuleId() {
    // Get existing Chrome dynamic rules
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const existingIds = new Set(existingRules.map(rule => rule.id));

    // Start at ID 1 and find the first non-conflicting ID
    let candidateId = 1;
    while (existingIds.has(candidateId)) {
        candidateId++;
    }

    return candidateId;
}

/**
 * Converts a HeaderForge rule to the format required by Chrome's declarativeNetRequest API.
 * 
 * @param {Object} rule - The rule to convert
 * @param {number} idOffset - Optional offset to add to the rule ID
 * @returns {Object|null} The rule in declarativeNetRequest format, or null if disabled
 */
export function convertToDNRRule(rule, idOffset = 0) {
    // Don't convert disabled rules
    if (rule.enabled === false) {
        return null;
    }

    return {
        id: rule.id + idOffset,
        priority: 1,
        action: {
            type: 'modifyHeaders',
            requestHeaders: rule.headers.map(h => ({
                header: h.name,
                operation: h.operation,
                value: h.operation === 'set' ? h.value : undefined
            }))
        },
        condition: {
            urlFilter: rule.urlPattern,
            resourceTypes: ['main_frame', 'sub_frame', 'stylesheet', 'script', 'image', 'font', 'object',
                'xmlhttprequest', 'ping', 'csp_report', 'media', 'websocket', 'other']
        }
    };
}
