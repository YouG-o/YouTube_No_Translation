/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */

import { descriptionLog, descriptionErrorLog } from '../../utils/logger';

export class DescriptionCache {
    private cache: Record<string, string> = {};
    private readonly MAX_ENTRIES = 50;
    private readonly CLEANUP_INTERVAL = 12 * 60 * 60 * 1000; // 12 hours in ms
    private lastCleanupTime = Date.now();

    constructor() {
        this.loadCache();
    }

    async loadCache(): Promise<void> {
        try {
            const result = await browser.storage.local.get('descriptionCache');
            if (result.descriptionCache) {
                if (typeof result.descriptionCache === 'string') {
                    this.cache = JSON.parse(result.descriptionCache);
                } else {
                    this.cache = result.descriptionCache as Record<string, string>;
                }
                descriptionLog('Persistent description cache loaded');
            }
        } catch (error) {
            descriptionErrorLog('Failed to load persistent description cache:', error);
        }
    }

    async saveCache(): Promise<void> {
        try {
            await browser.storage.local.set({ descriptionCache: JSON.stringify(this.cache) });
        } catch (error) {
            descriptionErrorLog('Failed to save persistent description cache:', error);
        }
    }

    async cleanupCache(): Promise<void> {
        const currentTime = Date.now();

        // Clear if older than interval
        if (currentTime - this.lastCleanupTime > this.CLEANUP_INTERVAL) {
            descriptionLog('Description cache expired, clearing all entries');
            this.cache = {};
            this.lastCleanupTime = currentTime;
            await this.saveCache();
            return;
        }

        // Keep only most recent entries if over size limit
        const keys = Object.keys(this.cache);
        if (keys.length > this.MAX_ENTRIES) {
            const trimmed: Record<string, string> = {};
            keys.slice(-this.MAX_ENTRIES).forEach(key => {
                trimmed[key] = this.cache[key];
            });
            this.cache = trimmed;
            await this.saveCache();
            descriptionLog('Description cache size limit reached, keeping most recent entries');
        }
    }

    async clear(): Promise<void> {
        this.cache = {};
        await browser.storage.local.remove('descriptionCache');
        descriptionLog('Description cache cleared');
    }

    async setDescription(videoId: string, description: string): Promise<void> {
        await this.cleanupCache();
        if (description) {
            this.cache[videoId] = description;
            await this.saveCache();
        }
    }

    getDescription(videoId: string): string | undefined {
        return this.cache[videoId];
    }
}

export const descriptionCache = new DescriptionCache();