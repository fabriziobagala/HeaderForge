import { convertToDNRRule } from './utils/dnr-utils.js';
import { faviconCache } from './utils/favicon-cache.js';

const INITIAL_RULE_ID = 1;

document.addEventListener('DOMContentLoaded', async () => {
    // ========== DOM Element References ==========
    const urlPatternInput = document.getElementById('urlPattern');
    const headersContainer = document.getElementById('headers');
    const addHeaderButton = document.getElementById('addHeader');
    const saveRuleButton = document.getElementById('saveRule');
    const exportButton = document.getElementById('exportRules');
    const importButton = document.getElementById('importRules');
    const importInput = document.getElementById('importInput');
    const rulesList = document.getElementById('rulesList');
    const deleteAllRulesButton = document.getElementById('deleteAllRules');

    /**
     * Stores the ID of the rule currently being edited, or null for new rules.
     * @type {number|null}
     */
    let currentRuleId = null;

    // ========== Initialize Manifest Info ==========
    // Get manifest data and populate description
    const manifest = chrome.runtime.getManifest();
    document.querySelectorAll('[data-manifest="description"]').forEach(el => {
        el.textContent = manifest.description;
    });

    // ========== Event Listeners Setup ==========
    // Main action buttons
    addHeaderButton.addEventListener('click', addHeaderRow);
    saveRuleButton.addEventListener('click', saveRule);
    exportButton.addEventListener('click', exportRules);
    importButton.addEventListener('click', () => importInput.click());
    importInput.addEventListener('change', importRules);
    deleteAllRulesButton.addEventListener('click', deleteAllRules);

    /**
     * Use event delegation for dynamically created edit/delete buttons.
     * This avoids attaching individual listeners to each button and handles
     * buttons created during runtime.
     */
    rulesList.addEventListener('click', (event) => {
        const editBtn = event.target.closest('.edit');
        if (editBtn) {
            handleEditButtonClick({ dataset: { id: editBtn.dataset.id } });
            return;
        }
        const deleteBtn = event.target.closest('.delete');
        if (deleteBtn) {
            handleDeleteButtonClick({ dataset: { id: deleteBtn.dataset.id } });
        }
    });


    rulesList.addEventListener('change', (event) => {
        const toggleSwitch = event.target.closest('.toggle-rule');
        if (toggleSwitch) {
            handleToggleRuleClick({ dataset: { id: toggleSwitch.dataset.id }, checked: toggleSwitch.checked });
        }
    });

    // ========== Initialize UI ==========
    // Initialize tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));

    // Add event listener for the help button
    document.getElementById('helpButton').addEventListener('click', function() {
        chrome.tabs.create({
            url: 'https://developer.chrome.com/docs/extensions/develop/concepts/match-patterns'
        });
    });
    
    // Start with one empty header row and load existing rules
    addHeaderRow();
    await loadRules();

    // ========== Rule Management Functions ==========
    /**
     * Loads rules from storage and renders them into the UI.
     */
    async function loadRules() {
        const { rules = [] } = await chrome.storage.local.get(['rules']);

        // Disable export button if there are no rules
        exportButton.disabled = rules.length === 0;

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
    async function handleEditButtonClick(e) {
        const id = parseInt(e.dataset.id);
        const { rules = [] } = await chrome.storage.local.get('rules');
        const rule = rules.find(r => r.id === id);

        if (rule) {
            // Set current rule for updating and fill form inputs
            currentRuleId = id;
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
    async function handleDeleteButtonClick(e) {
        const id = parseInt(e.dataset.id);
        const { rules = [] } = await chrome.storage.local.get('rules');
        const updatedRules = rules.filter(r => r.id !== id);

        // Update storage and reset nextRuleId if no rules left
        const storageUpdate = { rules: updatedRules };
        if (updatedRules.length === 0) {
            storageUpdate.nextRuleId = INITIAL_RULE_ID;
        }
        await chrome.storage.local.set(storageUpdate);

        // Remove the rule from Chrome's declarativeNetRequest system
        await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: [id] });
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
    async function handleToggleRuleClick(e) {
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
    async function deleteAllRules() {
        // First confirm with the user to prevent accidental deletion
        if (!confirm('Are you sure you want to delete all rules? This cannot be undone.')) {
            return;
        }

        // Reset storage to empty state
        await chrome.storage.local.set({ rules: [], nextRuleId: INITIAL_RULE_ID });

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
    }

    /**
     * Exports rules as a JSON file.
     * Creates a Blob and triggers a file download with timestamp in the filename.
     */
    async function exportRules() {
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
            console.error('Export failed:', error);
            alert('Failed to export rules. Please try again.');
        }
    }

    /**
     * Checks if two rules are equivalent by comparing their URL patterns and headers.
     * Used to prevent duplicate rules during import and save operations.
     * 
     * @param {Object} rule1 - First rule to compare
     * @param {Object} rule2 - Second rule to compare
     * @returns {boolean} Whether the two rules match in pattern and headers
     */
    function areRulesEquivalent(rule1, rule2) {
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
     * Imports rules from a JSON file.
     * Validates the file format and merges only unique new rules.
     * 
     * @param {Event} event - The change event from the file input
     */
    async function importRules(event) {
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
                : INITIAL_RULE_ID;

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
            console.error('Import failed:', error);
            alert(`Failed to import rules: ${error.message}`);
            event.target.value = '';
        }
    }

    /**
     * Saves a new rule or updates an existing one.
     * Validates input fields and checks for duplicate rules.
     */
    async function saveRule() {
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
            alert('Please enter URL pattern and at least one valid header');
            return;
        }

        // Get current rules from storage
        const { rules = [], nextRuleId: storedNextRuleId } = await chrome.storage.local.get(['rules', 'nextRuleId']);

        // Check against Chrome's rule limit for new rules
        if (rules.length >= chrome.declarativeNetRequest.MAX_NUMBER_OF_DYNAMIC_RULES && currentRuleId === null) {
            alert(`Cannot add more rules. Chrome extensions are limited to ${chrome.declarativeNetRequest.MAX_NUMBER_OF_DYNAMIC_RULES} dynamic rules.`);
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
            if (currentRuleId !== null && existingRule.id === currentRuleId) return false;
            return areRulesEquivalent(newRule, existingRule);
        });

        if (isDuplicate) {
            alert('A rule with these exact URL patterns and headers already exists.');
            return;
        }

        // Determine next rule ID logic
        let nextRuleId;
        if (rules.length === 0) {
            nextRuleId = INITIAL_RULE_ID;
        } else {
            nextRuleId = storedNextRuleId || Math.max(...rules.map(r => r.id)) + 1;
        }

        // Save new rule or update existing one
        if (currentRuleId === null) {
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
            const updatedRules = rules.map(r => r.id === currentRuleId ? { ...r, ...newRule } : r);
            await chrome.storage.local.set({ rules: updatedRules });

            // Update in Chrome's declarativeNetRequest
            await chrome.declarativeNetRequest.updateDynamicRules({
                removeRuleIds: [currentRuleId],
                addRules: [convertToDNRRule({ id: currentRuleId, ...newRule })]
            });
            currentRuleId = null;
        }

        // Reset form fields after saving
        urlPatternInput.value = '';
        headersContainer.innerHTML = '';
        addHeaderRow();
        await loadRules();
    }

    /**
     * Adds a new header row to the headers container.
     * Optionally pre-populates the row with provided values.
     * 
     * @param {string} [operation='set'] - Operation type ('set' or 'remove')
     * @param {string} [name=''] - Header name
     * @param {string} [value=''] - Header value
     */
    function addHeaderRow(operation = 'set', name = '', value = '') {
        // Create container for the header row with all required elements
        const div = document.createElement('div');
        div.className = 'header input-group mb-2';
        div.innerHTML = `
            <select class="form-select operation" style="max-width: 100px;">
                <option value="set" ${operation === 'set' ? 'selected' : ''}>Set</option>
                <option value="remove" ${operation === 'remove' ? 'selected' : ''}>Remove</option>
            </select>
            <input type="text" class="form-control name" placeholder="Header name" value="${name}">
            <input type="text" class="form-control value" placeholder="Header value" value="${value}">
            <button type="button" class="btn btn-outline-danger delete-header">
                <i class="bi bi-dash-circle"></i>
            </button>
        `;
        headersContainer.appendChild(div);

        // Set initial state for value input based on operation
        // "Remove" operation doesn't need a value field
        const operationSelect = div.querySelector('.operation');
        const valueInput = div.querySelector('.value');
        valueInput.disabled = operation === 'remove';

        // Add change event listener to toggle the value input
        operationSelect.addEventListener('change', (e) => {
            valueInput.disabled = e.target.value === 'remove';
            if (e.target.value === 'remove') {
                valueInput.value = '';
            }
        });

        // Delete button event listener
        const deleteButton = div.querySelector('.delete-header');
        deleteButton.addEventListener('click', () => {
            div.remove();
            updateDeleteButtonsState();
        });

        // Update delete buttons state
        updateDeleteButtonsState();
    }

    /**
     * Updates the state of delete buttons.
     * Disables the delete button if there's only one header row present.
     * At least one header is always required, so we prevent deleting the last one.
     */
    function updateDeleteButtonsState() {
        const headerRows = headersContainer.querySelectorAll('.header');
        headerRows.forEach(row => {
            row.querySelector('.delete-header').disabled = headerRows.length === 1;
        });
    }
});
