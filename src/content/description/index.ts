/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */

import { descriptionLog, descriptionErrorLog, coreLog } from '../../utils/logger';
import type { CacheData, CacheEntry } from '../../types/types';

export class DescriptionCache {
   private cache: Record<string, CacheEntry> = {};
    private readonly MAX_ENTRIES = 50;
    private readonly CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours in ms

    constructor() {
        this.loadCache();
    }

    async loadCache(): Promise<void> {
        try {
            const result = await browser.storage.local.get('ynt-cache');
            const yntCache = result['ynt-cache'] as CacheData | undefined;
            if (yntCache && yntCache.descriptions) {
                if (typeof yntCache.descriptions === 'string') {
                    this.cache = JSON.parse(yntCache.descriptions);
                } else if (yntCache.descriptions && typeof yntCache.descriptions === 'object') {
                    this.cache = yntCache.descriptions as Record<string, CacheEntry>;
                }
                descriptionLog('Persistent description cache loaded');
            }
        } catch (error) {
            descriptionErrorLog('Failed to load persistent description cache:', error);
        }
    }

    async saveCache(): Promise<void> {
        try {
            // Get existing cache data
            const result = await browser.storage.local.get('ynt-cache');
            const cacheData: CacheData = result['ynt-cache'] || {};
            
            // Update only description-related data
            cacheData.descriptions = JSON.stringify(this.cache);
            
            await browser.storage.local.set({ 'ynt-cache': cacheData });
        } catch (error) {
            descriptionErrorLog('Failed to save persistent description cache:', error);
        }
    }

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
            descriptionLog('Expired description cache entries removed');
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
            descriptionLog('Description cache size limit reached, keeping most recent entries');
        }
    }

    async clear(): Promise<void> {
        this.cache = {};
        try {
            // Get existing cache data
            const result = await browser.storage.local.get('ynt-cache');
            const cacheData: CacheData = result['ynt-cache'] || {};
            
            // Remove only description-related data
            delete cacheData.descriptions;
            
            // If cache object is empty, remove it completely
            if (Object.keys(cacheData).length === 0) {
                await browser.storage.local.remove('ynt-cache');
            } else {
                await browser.storage.local.set({ 'ynt-cache': cacheData });
            }
        } catch (error) {
            descriptionErrorLog('Failed to clear description cache:', error);
        }
        descriptionLog('Description cache cleared');
    }

    async setDescription(videoId: string, description: string): Promise<void> {
        await this.cleanupCache();
        if (description) {
           this.cache[videoId] = {
               content: description,
               timestamp: Date.now()
           };
            await this.saveCache();
        }
    }

    getDescription(videoId: string): string | undefined {
        // Trigger cleanup check on cache access
        this.cleanupCache().catch(error => {
            descriptionErrorLog('Failed to cleanup cache during read:', error);
        });
       return this.cache[videoId]?.content;
    }
}

export const descriptionCache = new DescriptionCache();

// Listen for cache clear messages
browser.runtime.onMessage.addListener((message: unknown) => {
    if (typeof message === 'object' && message !== null && 'action' in message) {
        if (message.action === 'clearCache') {
            descriptionCache.clear();
            coreLog('[Description cache cleared via message');
            return Promise.resolve(true);
        }
    }
    return false;
});