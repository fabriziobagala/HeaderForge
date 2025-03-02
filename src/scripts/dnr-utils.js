/**
 * Converts a given rule object to a Declarative Net Request (DNR) rule format.
 *
 * @param {Object} rule - The rule object to convert.
 * @param {number} rule.id - The unique identifier for the rule.
 * @param {Array} rule.headers - An array of header modification objects.
 * @param {string} rule.headers[].name - The name of the header to modify.
 * @param {string} rule.headers[].operation - The operation to perform on the header ('set', 'remove', etc.).
 * @param {string} [rule.headers[].value] - The value to set for the header (required if operation is 'set').
 * @param {string} rule.urlPattern - The URL pattern to match for the rule.
 * @returns {Object} The converted DNR rule object.
 */
export function convertToDNRRule(rule) {
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
