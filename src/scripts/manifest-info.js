document.addEventListener('DOMContentLoaded', function () {
    const manifest = chrome.runtime.getManifest();

    // Update only the description from manifest.json
    document.querySelectorAll('[data-manifest="description"]').forEach(el => {
        el.textContent = manifest.description;
    });
});
