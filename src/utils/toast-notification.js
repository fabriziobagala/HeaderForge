/**
 * Creates and shows a toast notification
 * @param {string} message - The message to display
 * @param {string} type - The type of notification: 'success', 'danger', 'warning', 'info'
 * @param {number} [delay=3000] - How long to show the toast in milliseconds
 */
export function showToast(message, type = 'info', delay = 3000) {
    const toastContainer = document.getElementById('toastContainer');
    const iconClass = getIconForType(type);

    let bgColorType;
    switch (type) {
        case 'danger': bgColorType = 'danger'; break;
        case 'success': bgColorType = 'success'; break;
        case 'warning': bgColorType = 'warning'; break;
        default: bgColorType = 'primary';
    }
    const bgColor = `bg-${bgColorType} text-white`;

    const toastId = `toast-${Date.now()}`;
    const toastHtml = `
        <div class="toast ${bgColor}" role="alert" aria-live="assertive" aria-atomic="true" id="${toastId}">
            <div class="toast-header">
                <i class="${iconClass} me-2"></i>
                <strong class="me-auto">HeaderForge</strong>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
            <div class="toast-body">
                ${message}
            </div>
        </div>
    `;

    // Add the toast to the container
    toastContainer.insertAdjacentHTML('beforeend', toastHtml);

    // Initialize and show the toast
    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement, { delay: delay });
    toast.show();

    // Clean up the DOM after the toast is hidden
    toastElement.addEventListener('hidden.bs.toast', () => {
        toastElement.remove();
    });
}

/**
 * Get the appropriate Bootstrap icon class for the notification type
 * @param {string} type - The type of notification
 * @returns {string} - Bootstrap icon class
 */
function getIconForType(type) {
    switch (type) {
        case 'success': return 'bi bi-check-circle-fill';
        case 'danger': return 'bi bi-exclamation-circle-fill';
        case 'warning': return 'bi bi-exclamation-triangle-fill';
        case 'info': default: return 'bi bi-info-circle-fill';
    }
}
