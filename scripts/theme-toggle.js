document.addEventListener('DOMContentLoaded', function() {
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
    
    // Function to set theme
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
});
