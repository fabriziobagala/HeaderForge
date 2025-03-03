import { exportRules, importRules } from './modules/rule-import-export.js';
import {
    deleteAllRules,
    handleDeleteButtonClick,
    handleEditButtonClick,
    handleToggleRuleClick,
    loadRules,
    saveRule
} from './modules/rule-manager.js';
import { addHeaderRow } from './modules/ui-helpers.js';

const INITIAL_RULE_ID = 1;

// Create a shared state object that modules can access
export const state = {
    currentRuleId: null,
    INITIAL_RULE_ID
};

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

    // Export DOM references for other modules to use
    window.app = {
        elements: {
            urlPatternInput,
            headersContainer,
            rulesList,
            exportButton,
            deleteAllRulesButton
        }
    };

    // ========== Initialize Manifest Info ==========
    // Get manifest data and populate description
    const manifest = chrome.runtime.getManifest();
    document.querySelectorAll('[data-manifest="description"]').forEach(el => {
        el.textContent = manifest.description;
    });

    // ========== Event Listeners Setup ==========
    // Main action buttons
    addHeaderButton.addEventListener('click', () => addHeaderRow());
    saveRuleButton.addEventListener('click', saveRule);
    exportButton.addEventListener('click', exportRules);
    importButton.addEventListener('click', () => importInput.click());
    importInput.addEventListener('change', importRules);
    deleteAllRulesButton.addEventListener('click', deleteAllRules);

    // Event delegation for dynamically created elements
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
    document.getElementById('helpButton').addEventListener('click', function () {
        chrome.tabs.create({
            url: 'https://developer.chrome.com/docs/extensions/develop/concepts/match-patterns'
        });
    });

    // ========== Theme Toggle ==========
    const themeToggle = document.getElementById('theme-toggle');
    const themeSwitch = document.querySelector('.theme-switch');

    // Check for saved theme preference or respect system preference
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    // Apply the saved theme or system preference
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        setTheme('dark');
        themeToggle.checked = true;
    } else {
        setTheme('light');
        themeToggle.checked = false;
    }

    // Toggle theme when checkbox is clicked
    themeToggle.addEventListener('change', () => {
        const newTheme = themeToggle.checked ? 'dark' : 'light';
        setTheme(newTheme);
    });

    /**
     * Sets the theme for the application
     * @param {string} theme - The theme to set ('dark' or 'light')
     */
    function setTheme(theme) {
        document.documentElement.setAttribute('data-bs-theme', theme);
        localStorage.setItem('theme', theme);

        // Update tooltip text based on the current theme
        const tooltipText = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
        themeSwitch.setAttribute('data-bs-title', tooltipText);

        // If a tooltip instance exists, update it
        const tooltipInstance = bootstrap.Tooltip.getInstance(themeSwitch);
        if (tooltipInstance) {
            tooltipInstance.dispose();
            // Re-initialize tooltip with proper method
            bootstrap.Tooltip.getOrCreateInstance(themeSwitch);
        }
    }

    // ========== Load Initial Rules ==========
    // Start with one empty header row and load existing rules
    addHeaderRow();
    await loadRules();
});
