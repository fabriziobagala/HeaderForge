document.addEventListener('DOMContentLoaded', function () {
    // Initialize tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));

    // Add event listener for the help button
    document.getElementById('helpButton').addEventListener('click', function () {
        chrome.tabs.create({
            url: 'https://developer.chrome.com/docs/extensions/develop/concepts/match-patterns'
        });
    });
});
