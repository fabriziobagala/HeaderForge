/**
 * Shows a confirmation modal dialog and returns a Promise
 * 
 * @param {string} message - The message to display in the confirmation dialog
 * @param {string} [title='Confirm Action'] - Optional title for the dialog
 * @param {string} [confirmText='Delete'] - Text to display on the confirm button
 * @param {string} [confirmClass='danger'] - Bootstrap color class for the confirm button
 * @returns {Promise<boolean>} A promise that resolves to true if confirmed, false otherwise
 */
export function showConfirmation(message, title = 'Confirm Action', confirmText = 'Delete', confirmClass = 'danger') {
    return new Promise((resolve) => {
        // Get references to modal elements
        const modalElement = document.getElementById('confirmModal');
        const modalTitle = document.getElementById('confirmModalLabel');
        const modalBody = document.getElementById('confirmModalBody');
        const confirmButton = document.getElementById('confirmModalYesBtn');

        // Update modal content
        modalTitle.textContent = title;
        modalBody.textContent = message;
        confirmButton.textContent = confirmText;
        confirmButton.className = `btn btn-${confirmClass}`;

        // Create a Bootstrap modal instance
        const modal = new bootstrap.Modal(modalElement);

        // Set up confirm button handler
        const clickHandler = () => {
            modal.hide();
            confirmButton.removeEventListener('click', clickHandler);
            resolve(true);
        };

        // Set up handlers for modal close events that result in "cancel"
        const cancelHandler = () => {
            confirmButton.removeEventListener('click', clickHandler);
            modalElement.removeEventListener('hidden.bs.modal', cancelHandler);
            resolve(false);
        };

        // Add event listeners
        confirmButton.addEventListener('click', clickHandler);
        modalElement.addEventListener('hidden.bs.modal', cancelHandler);

        // Show the modal
        modal.show();
    });
}
