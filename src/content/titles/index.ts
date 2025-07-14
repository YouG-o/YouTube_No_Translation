/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */

import { titlesLog, titlesErrorLog } from '../../utils/logger';


// Optimized cache manager
export class TitleCache {
    private apiCache = new Map<string, string>();
    private lastCleanupTime = Date.now();
    private readonly MAX_ENTRIES = 300;
    private readonly CLEANUP_INTERVAL = 20 * 60 * 1000; // 20 minutes in ms

    private cleanupCache(): void {
        const currentTime = Date.now();
        
        // Clear if older than interval
        if (currentTime - this.lastCleanupTime > this.CLEANUP_INTERVAL) {
            titlesLog('Cache expired, clearing all entries');
            this.clear();
            this.lastCleanupTime = currentTime;
            return;
        }

        // Keep only most recent entries if over size limit
        if (this.apiCache.size > this.MAX_ENTRIES) {
            const entries = Array.from(this.apiCache.entries());
            this.apiCache = new Map(entries.slice(-this.MAX_ENTRIES));
            //titlesLog('Cache size limit reached, keeping most recent entries');
        }
    }

    clear(): void {
        this.apiCache.clear();
        titlesLog('Cache cleared');
    }

    hasElement(element: HTMLElement): boolean {        
        return false;
    }

    setElement(element: HTMLElement, title: string): void {
        //titlesLog('Element caching disabled');
    }

    async getOriginalTitle(apiUrl: string): Promise<string> {
        this.cleanupCache();
        try {
            // If in cache, return cached value
            if (this.apiCache.has(apiUrl)) {
                return this.apiCache.get(apiUrl) || '';
            }

            // Fetch new title
            const response = await fetch(apiUrl);
            
            // If no title found keep current title
            if (!response.ok) {
                //titlesLog(`API error (${response.status}), keeping current title`);
                return '';
            }

            const data = await response.json();
            const title = data.title || '';
            
            // Cache the result
            if (title) {
                this.apiCache.set(apiUrl, title);
            }

            return title;
        } catch (error) {
            titlesErrorLog(`Failed to fetch title: ${error}`);
            return '';
        }
    }
}

export const titleCache = new TitleCache();


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