/**
 * Adds a new header row to the headers container.
 * Optionally pre-populates the row with provided values.
 * 
 * @param {string} [operation='set'] - Operation type ('set' or 'remove')
 * @param {string} [name=''] - Header name
 * @param {string} [value=''] - Header value
 */
export function addHeaderRow(operation = 'set', name = '', value = '') {
    const { elements } = window.app;
    const { headersContainer } = elements;

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
export function updateDeleteButtonsState() {
    const { elements } = window.app;
    const { headersContainer } = elements;

    const headerRows = headersContainer.querySelectorAll('.header');
    headerRows.forEach(row => {
        row.querySelector('.delete-header').disabled = headerRows.length === 1;
    });
}
