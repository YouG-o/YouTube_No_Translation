/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */

import { titlesLog, titlesErrorLog, coreLog } from '../../utils/logger';

/**
 * Persistent cache manager for video titles using browser.storage.local.
 * This cache survives page reloads and browser restarts.
 */
export class TitleCache {
    private cache: Record<string, string> = {};
    private readonly MAX_ENTRIES = 1000;
    private readonly CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours in ms
    private lastCleanupTime = Date.now();

    constructor() {
        this.loadCache();
    }

    /**
     * Loads the cache from browser.storage.local.
     */
    async loadCache(): Promise<void> {
        try {
            const result = await browser.storage.local.get('titleCache');
            if (result.titleCache) {
                if (typeof result.titleCache === 'string') {
                    this.cache = JSON.parse(result.titleCache);
                } else {
                    this.cache = result.titleCache as Record<string, string>;
                }
                titlesLog('Persistent title cache loaded');
            }
        } catch (error) {
            titlesErrorLog('Failed to load persistent cache:', error);
        }
    }

    /**
     * Saves the cache to browser.storage.local.
     */
    async saveCache(): Promise<void> {
        try {
            await browser.storage.local.set({ titleCache: JSON.stringify(this.cache) });
        } catch (error) {
            titlesErrorLog('Failed to save persistent cache:', error);
        }
    }

    /**
     * Cleans up the cache if it is too old or too large.
     */
    async cleanupCache(): Promise<void> {
        const currentTime = Date.now();

        // Clear if older than interval
        if (currentTime - this.lastCleanupTime > this.CLEANUP_INTERVAL) {
            titlesLog('Cache expired, clearing all entries');
            this.cache = {};
            this.lastCleanupTime = currentTime;
            await this.saveCache();
            return;
        }

        // Keep only most recent entries if over size limit
        const keys = Object.keys(this.cache);
        if (keys.length > this.MAX_ENTRIES) {
            // Remove the oldest entries
            const trimmed: Record<string, string> = {};
            keys.slice(-this.MAX_ENTRIES).forEach(key => {
                trimmed[key] = this.cache[key];
            });
            this.cache = trimmed;
            await this.saveCache();
            titlesLog('Cache size limit reached, keeping most recent entries');
        }
    }

    /**
     * Clears the cache completely.
     */
    async clear(): Promise<void> {
        this.cache = {};
        await browser.storage.local.remove('titleCache');
        titlesLog('Cache cleared');
    }

    /**
     * Stores a title in the cache.
     */
    async setTitle(videoId: string, title: string): Promise<void> {
        await this.cleanupCache();
        if (title) {
            this.cache[videoId] = title;
            await this.saveCache();
        }
    }

    /**
     * Retrieves a title from the cache.
     */
    getTitle(videoId: string): string | undefined {
        return this.cache[videoId];
    }
}

export const titleCache = new TitleCache();

// Listen for cache clear messages
browser.runtime.onMessage.addListener((message: unknown) => {
    if (typeof message === 'object' && message !== null && 'action' in message) {
        if (message.action === 'clearCache') {
            titleCache.clear();
            coreLog('Title cache cleared via message');
            return Promise.resolve(true);
        }
    }
    return false;
});


export async function fetchTitleInnerTube(videoId: string): Promise<string | null> {
    return new Promise<string | null>((resolve) => {
        // NOTE ON SCRIPT INJECTION:
        // This function injects a script into the page context to access YouTube's internal variables,
        // such as window.yt.config_.INNERTUBE_CLIENT_VERSION, which are not accessible from content scripts.
        // The injected script fetches the video title using the InnerTube API and dispatches the result
        // via a CustomEvent ("ynt-browsing-title-inner-tube-data").

        const handleTitle = (event: CustomEvent) => {
            if (event.detail?.videoId === videoId) {
                window.removeEventListener('ynt-browsing-title-inner-tube-data', handleTitle as EventListener);
                if (event.detail?.error) {
                    titlesErrorLog(`InnerTube script error for ${videoId}: ${event.detail.error}`);
                }
                resolve(event.detail?.title || null);
            }
        };

        window.addEventListener('ynt-browsing-title-inner-tube-data', handleTitle as EventListener);

        const script = document.createElement('script');
        script.src = browser.runtime.getURL('dist/content/scripts/TitlesInnerTube.js');
        script.setAttribute('data-video-id', videoId);
        document.documentElement.appendChild(script);

        setTimeout(() => {
            script.remove();
        }, 100);

        setTimeout(() => {
            window.removeEventListener('ynt-browsing-title-inner-tube-data', handleTitle as EventListener);
            resolve(null);
        }, 3000);
    });
}


/**
 * Fetch the original title of a YouTube video using the oEmbed API.
 * @param videoId The YouTube video ID.
 * @returns The original title as a string, or null if not found.
 */
export async function fetchTitleOembed(videoId: string): Promise<string | null> {
    const apiUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}`;
    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            return null;
        }
        const data = await response.json();
        return data.title || null;
    } catch (error) {
        titlesErrorLog(`Failed to fetch oEmbed title for ${videoId}: ${error}`);
        return null;
    }
}