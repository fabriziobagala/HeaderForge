import { state } from '../popup.js';
import { convertToDNRRule } from '../utils/dnr-utils.js';
import { faviconCache } from '../utils/favicon-cache.js';
import { showConfirmation } from '../utils/modal-confirmation.js';
import { showToast } from '../utils/toast-notification.js';
import { areRulesEquivalent } from './rule-import-export.js';
import { addHeaderRow } from './ui-helpers.js';

/**
 * Loads rules from storage and renders them into the UI.
 */
export async function loadRules() {
    const { elements } = window.app;
    const { rulesList, exportButton, deleteAllRulesButton } = elements;

    const { rules = [] } = await chrome.storage.local.get(['rules']);

    // Disable buttons if there are no rules
    const hasRules = rules.length > 0;
    exportButton.disabled = !hasRules;
    deleteAllRulesButton.disabled = !hasRules;

    // Clean expired cache entries occasionally (every ~10 loads)
    if (Math.random() < 0.1) {
        faviconCache.cleanCache();
    }

    // Prepare HTML generation
    const rulesHTML = [];

    // Process each rule
    for (const rule of rules) {
        // Extract domain from URL pattern for favicon
        const domainMatch = rule.urlPattern.match(/[^/]*\.([^/^*]+\.[^/^*]+)/);
        const domain = domainMatch ? domainMatch[0].replace(/^\*\./, '') : null;

        // Get favicon from cache or fetch new one
        let faviconUrl = null;
        if (domain) {
            faviconUrl = await faviconCache.getFavicon(domain);
        }

        // Default enabled to true if not specified
        const isEnabled = rule.enabled !== false;

        // Generate rule HTML
        rulesHTML.push(`
            <div class="list-group-item">
                <div>
                    ${faviconUrl ?
                `<img src="${faviconUrl}" 
                            onerror="this.onerror=null; this.src='images/icon-16.png';" 
                            class="me-1" width="16" height="16" alt="" />` :
                `<i class="bi bi-globe me-1" style="font-size: 16px;"></i>`
            }
                    <strong>URL:</strong> ${rule.urlPattern}
                </div>
                <div>
                    <strong>Headers:</strong> ${rule.headers.map(h =>
                `${h.operation} ${h.name}` + (h.value ? `=${h.value}` : '')
            ).join(', ')}
                </div>
                <div class="d-flex justify-content-between align-items-center mt-2">
                    <div class="form-check form-switch">
                        <input class="form-check-input toggle-rule" type="checkbox" role="switch"
                            id="toggle-${rule.id}" data-id="${rule.id}" ${isEnabled ? 'checked' : ''}>
                        <label class="form-check-label" for="toggle-${rule.id}">
                            ${isEnabled ? 'Enabled' : 'Disabled'}
                        </label>
                    </div>
                    <div>
                        <button class="btn btn-sm btn-outline-primary me-2 edit" data-id="${rule.id}">
                            <i class="bi bi-pencil-square"></i> Edit
                        </button>
                        <button class="btn btn-sm btn-outline-danger delete" data-id="${rule.id}">
                            <i class="bi bi-trash"></i> Delete
                        </button>
                    </div>
                </div>
            </div>
        `);
    }

    // Update the DOM
    rulesList.innerHTML = rulesHTML.join('');
}

/**
 * Handles the edit button click event.
 * Loads the rule for editing, populates the form, and switches to the edit tab.
 * 
 * @param {Object} e - Object containing dataset with rule id
 * @param {Object} e.dataset - Dataset containing the rule id
 * @param {string} e.dataset.id - String ID of the rule to edit
 */
export async function handleEditButtonClick(e) {
    const { elements } = window.app;
    const { urlPatternInput, headersContainer } = elements;

    const id = parseInt(e.dataset.id);
    const { rules = [] } = await chrome.storage.local.get('rules');
    const rule = rules.find(r => r.id === id);

    if (rule) {
        // Set current rule for updating and fill form inputs
        state.currentRuleId = id;
        urlPatternInput.value = rule.urlPattern;
        headersContainer.innerHTML = '';
        rule.headers.forEach(h => addHeaderRow(h.operation, h.name, h.value));

        // Switch to the edit tab
        const editTab = document.getElementById('edit-tab');
        const tabInstance = bootstrap.Tab.getInstance(editTab) || new bootstrap.Tab(editTab);
        tabInstance.show();
    }
}

/**
 * Handles the delete button click event.
 * Removes the rule from storage and updates the dynamic rules in Chrome.
 * 
 * @param {Object} e - Object containing dataset with rule id
 * @param {Object} e.dataset - Dataset containing the rule id
 * @param {string} e.dataset.id - String ID of the rule to delete
 */
export async function handleDeleteButtonClick(e) {
    const id = parseInt(e.dataset.id);
    const { rules = [], ruleIdOffset = 0 } = await chrome.storage.local.get(['rules', 'ruleIdOffset']);
    const updatedRules = rules.filter(r => r.id !== id);

    // Update storage and reset nextRuleId if no rules left
    const storageUpdate = { rules: updatedRules };
    if (updatedRules.length === 0) {
        storageUpdate.nextRuleId = state.INITIAL_RULE_ID;
    }
    await chrome.storage.local.set(storageUpdate);

    // Remove the rule from Chrome's declarativeNetRequest system using the stored offset
    await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: [id + ruleIdOffset]
    });

    await loadRules();
}

/**
 * Handles the toggle switch click event.
 * Enables or disables a rule without deleting it.
 * 
 * @param {Object} e - Object containing dataset with rule id and checked state
 * @param {Object} e.dataset - Dataset containing the rule id
 * @param {string} e.dataset.id - String ID of the rule to toggle
 * @param {boolean} e.checked - Whether the rule should be enabled
 */
export async function handleToggleRuleClick(e) {
    const id = parseInt(e.dataset.id);
    const isEnabled = e.checked;
    const { rules = [] } = await chrome.storage.local.get('rules');

    // Update the rule's enabled state in storage
    const updatedRules = rules.map(r => {
        if (r.id === id) {
            return { ...r, enabled: isEnabled };
        }
        return r;
    });

    await chrome.storage.local.set({ rules: updatedRules });

    // Update Chrome's declarativeNetRequest system
    if (isEnabled) {
        // Add the rule back if it's being enabled
        const ruleToAdd = updatedRules.find(r => r.id === id);
        if (ruleToAdd) {
            await chrome.declarativeNetRequest.updateDynamicRules({
                addRules: [convertToDNRRule(ruleToAdd)]
            });
        }
    } else {
        // Remove the rule if it's being disabled
        await chrome.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: [id]
        });
    }
}

/**
 * Deletes all rules from storage and dynamic rules.
 */
export async function deleteAllRules() {
    // First confirm with the user to prevent accidental deletion using modal
    const confirmed = await showConfirmation(
        'Are you sure you want to delete all rules? This cannot be undone.',
        'Delete All Rules',
        'Delete',
        'danger'
    );

    if (!confirmed) {
        return;
    }

    // Reset storage to empty state
    await chrome.storage.local.set({ rules: [], nextRuleId: state.INITIAL_RULE_ID });

    // Get and remove all existing dynamic rules
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const existingRuleIds = existingRules.map(rule => rule.id);
    if (existingRuleIds.length > 0) {
        await chrome.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: existingRuleIds
        });
    }

    // Update the UI
    await loadRules();
    showToast('All rules have been deleted', 'success');
}

/**
 * Saves a new rule or updates an existing one.
 * Validates input fields and checks for duplicate rules.
 */
export async function saveRule() {
    const { elements } = window.app;
    const { urlPatternInput, headersContainer } = elements;

    const urlPattern = urlPatternInput.value.trim();

    // Gather header rows data from the form
    const headers = Array.from(headersContainer.children)
        .map(row => {
            const operation = row.querySelector('.operation').value;
            const name = row.querySelector('.name').value.trim();
            const value = row.querySelector('.value').value.trim();
            return { operation, name, value };
        })
        .filter(h => h.name); // Filter out empty header names

    // Validate required fields
    if (!urlPattern || !headers.length) {
        showToast('Please enter URL pattern and at least one valid header', 'warning');
        return;
    }

    // Get current rules from storage
    const { rules = [], nextRuleId: storedNextRuleId } = await chrome.storage.local.get(['rules', 'nextRuleId']);

    // Check against Chrome's rule limit for new rules
    if (rules.length >= chrome.declarativeNetRequest.MAX_NUMBER_OF_DYNAMIC_RULES && state.currentRuleId === null) {
        showToast(`Cannot add more rules. Chrome extensions are limited to ${chrome.declarativeNetRequest.MAX_NUMBER_OF_DYNAMIC_RULES} dynamic rules.`, 'danger');
        return;
    }

    // Prepare new rule object
    const newRule = {
        urlPattern,
        headers,
        enabled: true
    };

    // Prevent duplicate rules (ignore rule being currently edited)
    const isDuplicate = rules.some(existingRule => {
        if (state.currentRuleId !== null && existingRule.id === state.currentRuleId) return false;
        return areRulesEquivalent(newRule, existingRule);
    });

    if (isDuplicate) {
        showToast('A rule with these exact URL patterns and headers already exists.', 'warning');
        return;
    }

    // Determine next rule ID logic
    let nextRuleId;
    if (rules.length === 0) {
        nextRuleId = state.INITIAL_RULE_ID;
    } else {
        nextRuleId = storedNextRuleId || Math.max(...rules.map(r => r.id)) + 1;
    }

    // Save new rule or update existing one
    if (state.currentRuleId === null) {
        // Creating new rule
        const ruleToAdd = { ...newRule, id: nextRuleId };
        await chrome.storage.local.set({
            rules: [...rules, ruleToAdd],
            nextRuleId: nextRuleId + 1
        });

        // Add to Chrome's declarativeNetRequest
        await chrome.declarativeNetRequest.updateDynamicRules({
            addRules: [convertToDNRRule(ruleToAdd)]
        });
    } else {
        // Updating existing rule
        const updatedRules = rules.map(r => r.id === state.currentRuleId ? { ...r, ...newRule } : r);
        await chrome.storage.local.set({ rules: updatedRules });

        // Update in Chrome's declarativeNetRequest
        await chrome.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: [state.currentRuleId],
            addRules: [convertToDNRRule({ id: state.currentRuleId, ...newRule })]
        });
        state.currentRuleId = null;
    }

    // Reset form fields after saving
    urlPatternInput.value = '';
    headersContainer.innerHTML = '';
    addHeaderRow();
    await loadRules();
    showToast('Rule saved successfully!', 'success');
}
