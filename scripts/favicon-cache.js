/**
 * Favicon cache utility for efficient favicon loading
 */
class FaviconCache {
    constructor() {
        this.CACHE_KEY = 'favicon_cache';
        this.CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
    }

    /**
     * Get favicon from cache or load from external source
     * @param {string} domain - Domain to fetch favicon for
     * @returns {Promise<string>} - URL to use for favicon
     */
    async getFavicon(domain) {
        if (!domain) {
            return null;
        }

        try {
            // Try to get from cache first
            const cache = await this.getCache();
            const cachedFavicon = cache[domain];

            // If we have a valid cached entry that's not expired
            if (cachedFavicon &&
                cachedFavicon.timestamp > Date.now() - this.CACHE_EXPIRY) {
                return cachedFavicon.url || cachedFavicon.dataUrl; // Support both old and new format
            }

            // No valid cache, fetch and store
            return await this.fetchAndCacheFavicon(domain);
        } catch (error) {
            console.error('Error getting favicon:', error);
            return null;
        }
    }

    /**
     * Fetch favicon from external source and cache it
     * @param {string} domain - Domain to fetch favicon for
     * @returns {Promise<string>} - URL of favicon
     */
    async fetchAndCacheFavicon(domain) {
        return new Promise((resolve) => {
            const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=16`;

            // Instead of trying to convert to data URL, just return the URL directly
            // This avoids CORS issues with canvas.toDataURL()
            resolve(faviconUrl);

            // Optionally cache the URL for future use
            this.cacheFavicon(domain, faviconUrl).catch(err => {
                console.warn('Failed to cache favicon URL:', err);
            });
        });
    }

    /**
     * Store favicon in cache
     * @param {string} domain - Domain
     * @param {string} url - URL of favicon
     */
    async cacheFavicon(domain, url) {
        const cache = await this.getCache();

        cache[domain] = {
            url,
            timestamp: Date.now()
        };

        await chrome.storage.local.set({ [this.CACHE_KEY]: cache });
    }

    /**
     * Get current cache
     * @returns {Promise<Object>} - Cache object
     */
    async getCache() {
        const data = await chrome.storage.local.get(this.CACHE_KEY);
        return data[this.CACHE_KEY] || {};
    }

    /**
     * Clean expired entries from cache
     */
    async cleanCache() {
        const cache = await this.getCache();
        const now = Date.now();
        let changed = false;

        Object.keys(cache).forEach(domain => {
            if (cache[domain].timestamp < now - this.CACHE_EXPIRY) {
                delete cache[domain];
                changed = true;
            }
        });

        if (changed) {
            await chrome.storage.local.set({ [this.CACHE_KEY]: cache });
        }
    }
}

// Export singleton instance
export const faviconCache = new FaviconCache();
