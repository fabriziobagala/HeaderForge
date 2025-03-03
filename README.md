# HeaderForge

A browser extension that lets you modify HTTP request headers for specific URL patterns.

## 🚀 Features

- Complete header management: add, edit, enable/disable, or remove HTTP request headers
- Powerful pattern matching with wildcard URL pattern support
- Support for multiple rules per URL pattern
- User-friendly interface with dark/light mode support
- Real-time header modification without browser restart

## 📦 Installation

<!-- ### Chrome Web Store (Recommended)

1. Visit the [HeaderForge page on Chrome Web Store]()
2. Click "Add to Chrome" button
3. Confirm the installation when prompted -->

### Manual Installation

1. Clone this repository or download as ZIP
2. Open Chrome and navigate to `chrome://extensions`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the HeaderForge directory

## 🔧 Usage

1. Click the HeaderForge icon in your browser toolbar
2. Manage header modification rules:
    - **Add new rules**: Specify URL pattern, select the operation to be performed (set/remove), and add the header name and/or value
    - **Edit existing rules**: Click the edit icon on any rule to modify its parameters
    - **Delete rules**: Click the trash icon to remove unwanted rules
    - **Enable/disable rules**: Toggle the switch for any rule
3. All changes take effect immediately for new requests, but you must refresh web pages to see them applied effectively

## 🔍 Project Structure

The extension is organized as follows:
- `background` - Contains the service worker that applies rules in the background
    - `service_worker.js` - Initializes and applies header modification rules
- `icons` - Extension icons in various sizes for browser display
- `images` - Contains SVG logo and UI assets
- `lib` - Third-party libraries
    - `bootstrap-5.3.3/` - CSS framework for the UI
    - `bootstrap-icons-1.11.3/` - Icon set used throughout the interface
- `modules` - Core business logic
    - `rule-import-export.js` - Handles importing/exporting of rules
    - `rule-manager.js` - CRUD operations for header rules
    - `ui-helpers.js` - UI manipulation functions
- `utils` - Utility functions
    - `dnr-utils.js` - Declarative Net Request API helpers
    - `favicon-cache.js` - Caching system for domain favicons
- `popup.js` - Main entry point for the extension UI
- `popup.html` - HTML structure for the extension popup
- `popup.css` - Styling for the extension popup
- `manifest.json` - Extension configuration file

## 📄 License
This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## 🤝 Contributing
Contributions are welcome! Feel free to submit a pull request or open an issue.
