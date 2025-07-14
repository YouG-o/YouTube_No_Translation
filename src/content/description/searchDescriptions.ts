/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */

import { descriptionLog, descriptionErrorLog } from '../../utils/logger';
import { currentSettings } from '../index';
import { ensureIsolatedPlayer } from '../../utils/isolatedPlayer';
import { isSearchResultsPage } from '../../utils/navigation';


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



export async function fetchSearchDescriptionPlayerAPI(videoId: string): Promise<string | null> {
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

async function fetchSearchDescriptionDataApi(videoId: string): Promise<string | null> {
    if (currentSettings?.youtubeDataApi?.enabled && currentSettings?.youtubeDataApi?.apiKey) {
        try {
            const youtubeApiUrl = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${currentSettings.youtubeDataApi.apiKey}&part=snippet`;
            const response = await fetch(youtubeApiUrl);

            if (response.ok) {
                const data = await response.json();
                if (data.items && data.items.length > 0) {
                    return data.items[0].snippet.description;
                }
            } else {
                descriptionErrorLog(
                    `YouTube Data API v3 failed for description ${videoId}: ${response.status} ${response.statusText}`
                );
            }
        } catch (apiError) {
            descriptionErrorLog(
                `YouTube Data API v3 error for description ${videoId}:`,
                apiError
            );
        }
    }
    return null;
}

async function fetchSearchDescriptionInnerTube(videoId: string): Promise<string | null> {
    return new Promise<string | null>((resolve) => {
        // NOTE ON SCRIPT INJECTION:
        // This function injects a script into the page context to access YouTube's internal variables,
        // such as window.yt.config_.INNERTUBE_CLIENT_VERSION, which are not accessible from content scripts.
        // The injected script fetches the video description using the InnerTube API and dispatches the result
        // via a CustomEvent ("ynt-search-description-inner-tube-data").

        const handleDescription = (event: CustomEvent) => {
            if (event.detail?.videoId === videoId) {
                window.removeEventListener('ynt-search-description-inner-tube-data', handleDescription as EventListener);
                // Log any error from the script
                if (event.detail?.error) {
                    descriptionErrorLog(`InnerTube script error for ${videoId}: ${event.detail.error}`);
                }
                resolve(event.detail?.description || null);
            }
        };

        window.addEventListener('ynt-search-description-inner-tube-data', handleDescription as EventListener);

        const script = document.createElement('script');
        script.src = browser.runtime.getURL('dist/content/scripts/searchDescriptionInnerTube.js');
        script.setAttribute('data-video-id', videoId);
        document.documentElement.appendChild(script);

        setTimeout(() => {
            script.remove();
        }, 100);
        // Timeout in case of no response
        setTimeout(() => {
            window.removeEventListener('ynt-search-description-inner-tube-data', handleDescription as EventListener);
            resolve(null);
        }, 3000);
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

            /* Show original description for history page */
            ytd-video-renderer #description-text[ynt-search] {
                display: block !important;
                color: var(--yt-spec-text-secondary);
                white-space: pre-line;
            }
        `;
        document.head.appendChild(style);
    }

    // Detect container for search page or history page
    const container = element.closest('.metadata-snippet-container, .metadata-snippet-container-one-line') as HTMLElement | null;

    const lines = description.split('\n');
    const shortDescription = lines.slice(0, 2).join('\n');
    const truncatedDescription = shortDescription.length > 100 ?
        shortDescription.substring(0, 100) + '...' : shortDescription;

    if (container) {
        container.setAttribute('data-original-description', truncatedDescription);
        container.setAttribute('ynt-search', videoId);
        element.setAttribute('ynt-search', videoId);
        element.setAttribute('translate', 'no');
    } else if (element.id === 'description-text') {
        // History page: directly update the text content
        element.textContent = truncatedDescription;
        element.setAttribute('ynt-search', videoId);
        element.setAttribute('translate', 'no');
    }

    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList' || mutation.type === 'characterData') {
                if (!element.hasAttribute('ynt-search')) {
                    element.setAttribute('ynt-search', videoId);
                }
                if (container && !container.hasAttribute('ynt-search')) {
                    container.setAttribute('ynt-search', videoId);
                    container.setAttribute('data-original-description', truncatedDescription);
                }
                if (!container && element.id === 'description-text') {
                    element.textContent = truncatedDescription;
                }
            }
        });
    });

    observer.observe(element, { childList: true, characterData: true });
    if (container) {
        observer.observe(container, { childList: true, attributes: true });
    }

    searchDescriptionsObserver.set(element, observer);
}


export function shouldProcessSearchDescriptionElement(isTranslated: boolean): boolean {
    if (!currentSettings) return false;
    return isSearchResultsPage() &&
        isTranslated &&
        currentSettings.descriptionTranslation
}

export async function processSearchDescriptionElement(titleElement: HTMLElement, videoId: string): Promise<void> {
    try {
        // Find the video element container to get description
        const videoElement = titleElement.closest('ytd-video-renderer') as HTMLElement;
        if (videoElement) {
            let descriptionElement = videoElement.querySelector('.metadata-snippet-text') as HTMLElement | null;
            if (!descriptionElement) {
                // Fallback for history page
                descriptionElement = videoElement.querySelector('#description-text') as HTMLElement | null;
            }
            if (descriptionElement) {
                // Check if description already processed
                const isAlreadyProcessed = descriptionElement.hasAttribute('ynt-search') && 
                                           descriptionElement.getAttribute('ynt-search') === videoId;
                const hasFailed = descriptionElement.hasAttribute('ynt-search-fail') && 
                                  descriptionElement.getAttribute('ynt-search-fail') === videoId;
                
                if (!isAlreadyProcessed && !hasFailed) {
                    try {
                        let originalDescription: string | null = null;
                        
                        // Fetch description using InnerTube API first
                        originalDescription = await fetchSearchDescriptionInnerTube(videoId);

                        // Try YouTube Data API v3 first if enabled and API key available
                        if (currentSettings?.youtubeDataApi?.enabled && currentSettings?.youtubeDataApi?.apiKey) {
                            originalDescription = await fetchSearchDescriptionDataApi(videoId);
                        }
                        
                        // If YouTube Data API failed or not enabled, use player API if 
                        if (!originalDescription && currentSettings?.youtubeIsolatedPlayerFallback?.searchResultsDescriptions) {
                            const playerReady = await ensureIsolatedPlayer('ynt-player-descriptions');
                            if (playerReady) {
                                originalDescription = await fetchSearchDescriptionPlayerAPI(videoId);
                            }
                        }
                        
                        if (originalDescription) {
                            updateSearchDescriptionElement(descriptionElement, originalDescription, videoId);
                        } else {
                            descriptionElement.setAttribute('ynt-search-fail', videoId);
                        }
                    } catch (descError) {
                        descriptionErrorLog(`Failed to update search description for ${videoId}:`, descError);
                        descriptionElement.setAttribute('ynt-search-fail', videoId);
                    }
                }
            }
        }
    } catch (error) {
        descriptionErrorLog(`Failed to process description for ${videoId}:`, error);
    }
}