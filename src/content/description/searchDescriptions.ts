/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */

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

function cleanupAllSearchDescriptionsObservers(): void {
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

async function fetchSearchDescription(videoId: string): Promise<string | null> {
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
        }, 5000);

        const handleDescription = (event: CustomEvent) => {
            if (event.detail?.videoId === videoId) {
                clearTimeout(timeoutId);
                window.removeEventListener('ynt-search-description-data', handleDescription as EventListener);
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

function updateSearchDescriptionElement(element: HTMLElement, description: string, videoId: string): void {
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

            /* Show original description using CSS variables */
            .metadata-snippet-container[ynt-search]::after {
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

    const container = element.closest('.metadata-snippet-container') as HTMLElement;
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

async function refreshSearchDescriptions(): Promise<void> {
    if (!window.location.pathname.includes('/results')) {
        return;
    }

    const now = Date.now();
    if (now - lastSearchDescriptionsRefresh < SEARCH_DESCRIPTIONS_THROTTLE) {
        return;
    }
    lastSearchDescriptionsRefresh = now;

    const player = document.getElementById('movie_player');
    if (!player) {
        return;
    }

    const searchResults = document.querySelectorAll('ytd-video-renderer') as NodeListOf<HTMLElement>;
    
    for (const videoElement of searchResults) {
        const titleLink = videoElement.querySelector('#video-title') as HTMLAnchorElement;
        if (!titleLink?.href) continue;

        // Only process videos that have been identified as translated by browsingTitles
        if (!titleLink.hasAttribute('ynt')) {
            continue;
        }

        const videoId = extractVideoId(titleLink.href);
        if (!videoId) continue;

        const descriptionElement = videoElement.querySelector('.metadata-snippet-text') as HTMLElement;
        if (!descriptionElement) continue;

        // Skip if already processed for this video
        if (descriptionElement.hasAttribute('ynt-search-fail')) {
            if (descriptionElement.getAttribute('ynt-search-fail') === videoId) {
                continue;
            }
            descriptionElement.removeAttribute('ynt-search-fail');
        }

        if (descriptionElement.hasAttribute('ynt-search')) {
            if (descriptionElement.getAttribute('ynt-search') === videoId) {
                continue;
            }
        }

        try {
            const originalDescription = await fetchSearchDescription(videoId);
            
            if (!originalDescription) {
                descriptionErrorLog(`Failed to get original description from player API: ${videoId}, keeping current description`);
                descriptionElement.removeAttribute('ynt-search');
                descriptionElement.setAttribute('ynt-search-fail', videoId);
                continue;
            }

            // Since the video is already marked as translated (has ynt attribute), replace the description
            //descriptionLog(`Replacing translated description for video: ${videoId}`);
            updateSearchDescriptionElement(descriptionElement, originalDescription, videoId);
            
        } catch (error) {
            descriptionErrorLog(`Failed to update search description for ${videoId}:`, error);
            descriptionElement.setAttribute('ynt-search-fail', videoId);
        }

        await new Promise(resolve => setTimeout(resolve, 600));
    }
}