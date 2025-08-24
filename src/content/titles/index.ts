/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */

import { titlesLog, titlesErrorLog, coreLog } from '../../utils/logger';
import type { CacheData, CacheEntry } from '../../types/types';

/**
 * Persistent cache manager for video titles using browser.storage.local.
 * This cache survives page reloads and browser restarts.
 */
export class TitleCache {
    private cache: Record<string, CacheEntry> = {};
    private readonly MAX_ENTRIES = 1000;
    private readonly CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours in ms

    constructor() {
        this.loadCache();
    }

    /**
     * Loads the cache from browser.storage.local.
     */
    async loadCache(): Promise<void> {
        try {
            const result = await browser.storage.local.get('ynt-cache');
            const cacheData = result['ynt-cache'] as CacheData;
            if (cacheData && 'titles' in cacheData && cacheData.titles) {
                if (typeof cacheData.titles === 'string') {
                    this.cache = JSON.parse(cacheData.titles);
                } else {
                    this.cache = cacheData.titles as Record<string, CacheEntry>;
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
            // Get existing cache data
            const result = await browser.storage.local.get('ynt-cache');
            const cacheData: CacheData = result['ynt-cache'] || {};
            
            // Update only title-related data
            cacheData.titles = JSON.stringify(this.cache);
            
            await browser.storage.local.set({ 'ynt-cache': cacheData });
        } catch (error) {
            titlesErrorLog('Failed to save persistent cache:', error);
        }
    }

    /**
     * Cleans up the cache if it is too old or too large.
     */
    async cleanupCache(): Promise<void> {
        const currentTime = Date.now();
        let hasExpiredEntries = false;

        // Remove entries older than interval
        Object.keys(this.cache).forEach(videoId => {
            const entry = this.cache[videoId];
            if (currentTime - entry.timestamp > this.CLEANUP_INTERVAL) {
                delete this.cache[videoId];
                hasExpiredEntries = true;
            }
        });

        if (hasExpiredEntries) {
            await this.saveCache();
            titlesLog('Expired title cache entries removed');
        }

        // Keep only most recent entries if over size limit
        const keys = Object.keys(this.cache);
        if (keys.length > this.MAX_ENTRIES) {
            // Sort by timestamp (newest first) and keep only the most recent
            const sortedEntries = keys
                .map(key => ({ key, timestamp: this.cache[key].timestamp }))
                .sort((a, b) => b.timestamp - a.timestamp)
                .slice(0, this.MAX_ENTRIES);

            const trimmed: Record<string, CacheEntry> = {};
            sortedEntries.forEach(entry => {
                trimmed[entry.key] = this.cache[entry.key];
            });
            
            this.cache = trimmed;
            await this.saveCache();
            titlesLog('Title cache size limit reached, keeping most recent entries');
        }
    }

    /**
     * Clears the cache completely.
     */
    async clear(): Promise<void> {
        this.cache = {};
        try {
            // Get existing cache data
            const result = await browser.storage.local.get('ynt-cache');
            const cacheData: CacheData = result['ynt-cache'] || {};
            
            // Remove only title-related data
            delete cacheData.titles;
            
            // If cache object is empty, remove it completely
            if (Object.keys(cacheData).length === 0) {
                await browser.storage.local.remove('ynt-cache');
            } else {
                await browser.storage.local.set({ 'ynt-cache': cacheData });
            }
        } catch (error) {
            titlesErrorLog('Failed to clear title cache:', error);
        }
        titlesLog('Cache cleared');
    }

    /**
     * Stores a title in the cache.
     */
    async setTitle(videoId: string, title: string): Promise<void> {
        await this.cleanupCache();
        if (title) {
            this.cache[videoId] = {
                content: title,
                timestamp: Date.now()
            };
            await this.saveCache();
        }
    }

    /**
     * Retrieves a title from the cache.
     */
    getTitle(videoId: string): string | undefined {
        // Trigger cleanup check on cache access
        this.cleanupCache().catch(error => {
            titlesErrorLog('Failed to cleanup cache during read:', error);
        });
        return this.cache[videoId]?.content;
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