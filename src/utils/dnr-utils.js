/**
 * Converts a HeaderForge rule to a Declarative Net Request (DNR) rule format.
 * This function transforms the internal rule representation into the format required by Chrome's
 * Declarative Net Request API for header modifications.
 *
 * @param {Object} rule - The HeaderForge rule to convert
 * @param {string} rule.id - Unique identifier for the rule
 * @param {boolean} [rule.enabled] - Whether the rule is enabled
 * @param {string} rule.urlPattern - URL pattern to match requests against
 * @param {Array<Object>} rule.headers - Headers to be modified
 * @param {string} rule.headers[].name - Name of the header
 * @param {string} rule.headers[].operation - Operation to perform ('set', 'remove', etc.)
 * @param {string} [rule.headers[].value] - Value for the header (required for 'set' operation)
 * 
 * @returns {Object|null} The DNR rule object compatible with Chrome's Declarative Net Request API, 
 *                        or null if the rule is disabled
 */
export function convertToDNRRule(rule) {
    if (rule.enabled === false) {
        return null;
    }

    return {
        id: rule.id,
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
            urlFilter: rule.urlPattern
        }
    };
}
