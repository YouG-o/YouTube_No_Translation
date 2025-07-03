/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */

import { descriptionLog, descriptionErrorLog } from '../loggings';
import { ensureIsolatedPlayer } from '../utils/isolatedPlayer';


let searchDescriptionsObserver = new Map<HTMLElement, MutationObserver>();
let lastSearchDescriptionsRefresh = 0;
const SEARCH_DESCRIPTIONS_THROTTLE = 1000;

function cleanupSearchDescriptionElement(element: HTMLElement): void {
    const observer = searchDescriptionsObserver.get(element);
    if (observer) {
        observer.disconnect();
        searchDescriptionsObserver.delete(element);
    }
}

export function cleanupAllSearchDescriptionsObservers(): void {
    searchDescriptionsObserver.forEach((observer, element) => {
        observer.disconnect();
    });
    searchDescriptionsObserver.clear();
    lastSearchDescriptionsRefresh = 0;
}

function extractVideoId(url: string): string | null {
    try {
        const urlObj = new URL(url);
        return urlObj.searchParams.get('v');
    } catch {
        return null;
    }
}

export async function fetchSearchDescription(videoId: string): Promise<string | null> {
    return new Promise<string | null>(async (resolve) => {
        // Ensure isolated player exists before proceeding with specific ID for descriptions
        const playerReady = await ensureIsolatedPlayer('ynt-player-descriptions');
        if (!playerReady) {
            descriptionErrorLog(`Failed to create isolated player for video: ${videoId}`);
            resolve(null);
            return;
        }

        const timeoutId = setTimeout(() => {
            window.removeEventListener('ynt-search-description-data', handleDescription as EventListener);
            resolve(null);
        }, 3000);

        const handleDescription = (event: CustomEvent) => {
            if (event.detail?.videoId === videoId) {
                clearTimeout(timeoutId);
                window.removeEventListener('ynt-search-description-data', handleDescription as EventListener);
                
                // Log any error from the script
                if (event.detail?.error) {
                    descriptionErrorLog(`Search description script error for ${videoId}: ${event.detail.error}`);
                }
                
                resolve(event.detail?.description || null);
            }
        };

        window.addEventListener('ynt-search-description-data', handleDescription as EventListener);
        
        const script = document.createElement('script');
        script.src = browser.runtime.getURL('dist/content/scripts/searchDescriptionScript.js');
        script.setAttribute('data-video-id', videoId);
        script.setAttribute('data-player-id', 'ynt-player-descriptions');
        document.documentElement.appendChild(script);
        
        setTimeout(() => {
            script.remove();
        }, 100);
    });
}

export function updateSearchDescriptionElement(element: HTMLElement, description: string, videoId: string): void {
    cleanupSearchDescriptionElement(element);
    
    descriptionLog(
        `Updated search description for video: %c${videoId}%c`,
        'color: #4ade80',
        'color: #fca5a5'
    );

    // Inject CSS if not already done
    if (!document.querySelector('#ynt-search-style')) {
        const style = document.createElement('style');
        style.id = 'ynt-search-style';
        style.textContent = `
            /* Hide translated description text */
            .metadata-snippet-text[ynt-search] {
                display: none !important;
            }

            /* Show original description using CSS variables for regular videos */
            .metadata-snippet-container[ynt-search]::after {
                content: attr(data-original-description);
                font-size: var(--ytd-tab-system-font-size-body);
                line-height: var(--ytd-tab-system-line-height-body);
                font-family: var(--ytd-tab-system-font-family);
                color: var(--yt-spec-text-secondary);
                white-space: pre-line;
            }

            /* Show original description using CSS variables for videos with chapters */
            .metadata-snippet-container-one-line[ynt-search]::after {
                content: attr(data-original-description);
                font-size: var(--ytd-tab-system-font-size-body);
                line-height: var(--ytd-tab-system-line-height-body);
                font-family: var(--ytd-tab-system-font-family);
                color: var(--yt-spec-text-secondary);
                white-space: pre-line;
            }
        `;
        document.head.appendChild(style);
    }

    const container = element.closest('.metadata-snippet-container, .metadata-snippet-container-one-line') as HTMLElement;
    if (!container) return;

    const lines = description.split('\n');
    const shortDescription = lines.slice(0, 2).join('\n');
    const truncatedDescription = shortDescription.length > 100 ? 
        shortDescription.substring(0, 100) + '...' : shortDescription;

    container.setAttribute('data-original-description', truncatedDescription);
    container.setAttribute('ynt-search', videoId);
    element.setAttribute('ynt-search', videoId);
    element.setAttribute('translate', 'no');

    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList' || mutation.type === 'characterData') {
                if (!element.hasAttribute('ynt-search')) {
                    element.setAttribute('ynt-search', videoId);
                }
                if (!container.hasAttribute('ynt-search')) {
                    container.setAttribute('ynt-search', videoId);
                    container.setAttribute('data-original-description', truncatedDescription);
                }
            }
        });
    });

    observer.observe(element, { childList: true, characterData: true });
    observer.observe(container, { childList: true, attributes: true });
    
    searchDescriptionsObserver.set(element, observer);
}