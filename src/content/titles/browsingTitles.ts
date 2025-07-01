/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */

// --- Global variables
let browsingTitlesObserver = new Map<HTMLElement, MutationObserver>();
let lastBrowsingTitlesRefresh = 0;
let lastBrowsingShortsRefresh = 0;
const TITLES_THROTTLE = 1000;
const browsingTitlesFallbackQueue = new Set<string>();
const processingVideos = new Set<string>(); // Track individual videos being processed

// --- Utility Functions
function cleanupBrowsingTitleElement(element: HTMLElement): void {
    const observer = browsingTitlesObserver.get(element);
    if (observer) {
        //browsingTitlesLog('Cleaning up title observer');
        observer.disconnect();
        browsingTitlesObserver.delete(element);
    }
}

function cleanupAllBrowsingTitlesElementsObservers(): void {
    //browsingTitlesLog('Cleaning up all title observers');
    browsingTitlesObserver.forEach((observer, element) => {
        observer.disconnect();
    });
    browsingTitlesObserver.clear();
    
    // Reset refresh timestamps and clear processing videos
    lastBrowsingTitlesRefresh = 0;
    lastBrowsingShortsRefresh = 0;
    processingVideos.clear();
}

function updateBrowsingTitleElement(element: HTMLElement, title: string, videoId: string): void {
    // Clean previous observer
    cleanupBrowsingTitleElement(element);

    // Clean ALL previous attributes before applying new ones
    element.removeAttribute('ynt');
    element.removeAttribute('ynt-fail');
    element.removeAttribute('ynt-fail-retry');
    element.removeAttribute('ynt-original');
    
    const previousTitle = element.textContent;

    // Directly update the textContent with the original title
    element.textContent = title;
    
    // Update the title attribute and ynt attribute
    element.setAttribute('title', title);
    element.setAttribute('ynt', videoId);
    
    browsingTitlesLog(
        `Updated title from : %c${normalizeText(previousTitle)}%c to : %c${normalizeText(title)}%c (video id : %c${videoId}%c)`,
        'color: grey',
        'color: #fca5a5',
        'color: white',
        'color: #fca5a5',
        'color: #4ade80',
        'color: #fca5a5'
    );
    
    // Add observer to keep textContent in sync if YouTube changes it
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                // If YouTube injects a new text node, replace it with the original title
                if (element.textContent !== title) {
                    element.textContent = title;
                }
            }
        });
    });

    observer.observe(element, {
        childList: true
    });

    browsingTitlesObserver.set(element, observer);
    titleCache.setElement(element, title);
}

// Add function to handle fallback title retrieval
async function getBrowsingTitleFallback(videoId: string): Promise<string | null> {
    return new Promise((resolve) => {
        // Prevent duplicate requests
        if (browsingTitlesFallbackQueue.has(videoId)) {
            resolve(null);
            return;
        }

        // Ensure isolated player exists before proceeding with specific ID for titles
        if (!ensureIsolatedPlayer('ynt-player-titles')) {
            resolve(null);
            return;
        }
        
        browsingTitlesFallbackQueue.add(videoId);
        
        const cleanup = () => {
            browsingTitlesFallbackQueue.delete(videoId);
            window.removeEventListener('ynt-browsing-title-fallback-data', onTitleReceived as EventListener);
        };

        const onTitleReceived = (event: Event) => {
            const customEvent = event as CustomEvent;
            const { videoId: receivedVideoId, title, error } = customEvent.detail;
            
            if (receivedVideoId === videoId) {
                cleanup();
                if (error) {
                    resolve(null);
                } else {
                    resolve(title);
                }
            }
        };

        window.addEventListener('ynt-browsing-title-fallback-data', onTitleReceived as EventListener);
        
        const script = document.createElement('script');
        script.src = browser.runtime.getURL('dist/content/scripts/browsingTitlesFallbackScript.js');
        script.setAttribute('data-video-id', videoId);
        script.setAttribute('data-player-id', 'ynt-player-titles');
        document.documentElement.appendChild(script);
        
        setTimeout(() => {
            script.remove();
        }, 100);

        // Timeout cleanup
        setTimeout(() => {
            cleanup();
            resolve(null);
        }, 3000);
    });
}

async function refreshBrowsingVideos(): Promise<void> {
    const now = Date.now();
    if (now - lastBrowsingTitlesRefresh < TITLES_THROTTLE) {
        return;
    }
    lastBrowsingTitlesRefresh = now;

    //browseTitlesLog('Refreshing browsing titles');
    const browsingTitles = document.querySelectorAll('#video-title') as NodeListOf<HTMLElement>;
    //browsingTitlesLog('Found videos titles:', browsingTitles.length);

    for (const titleElement of browsingTitles) {
        //browsingTitlesLog('Processing video title:', titleElement.textContent);
        const videoUrl = titleElement.closest('a')?.href;
        let isTranslated = false;
        if (videoUrl) {
            // If the video URL contains a 'list' parameter, it's likely an album or playlist item.
            // We skip it because it would apply wrong title (video title instead of album/playlist title).
            if (videoUrl.includes('&list=') || videoUrl.includes('/playlist?list=')) {
                //browsingTitlesLog(`Skipping playlist/album item: ${titleElement.textContent} (URL: ${videoUrl})`);
                // Clean up any attributes the extension might have previously set incorrectly on this element
                titleElement.removeAttribute('ynt-fail');
                titleElement.removeAttribute('ynt-original');
                titleElement.removeAttribute('ynt');
                // Ensure the browser tooltip (title attribute) matches the visible text if it was changed
                if (titleElement.textContent && titleElement.getAttribute('title') !== titleElement.textContent) {
                    titleElement.setAttribute('title', titleElement.textContent);
                }
                continue;
            }

            let videoId: string | null = null;
            try {
                const url = new URL(videoUrl);

                if (url.pathname.startsWith('/watch')) {
                    // Classic video
                    videoId = new URLSearchParams(url.search).get('v');
                } else if (url.pathname.startsWith('/shorts/')) {
                    // Short video - extract ID from path
                    const pathParts = url.pathname.split('/');
                    videoId = pathParts.length > 2 ? pathParts[2] : null;
                }
            } catch (urlError) {
                browsingTitlesErrorLog('Failed to parse video URL:', urlError);
                continue;
            }
            
            if (videoId) {
                // Skip if this video is currently being processed
                if (processingVideos.has(videoId)) {
                    continue;
                }
                // Mark this video as being processed
                processingVideos.add(videoId);
                try {
                    const currentTitle = titleElement.textContent || '';

                    // Check if already processed successfully - BEFORE making API calls
                    if (titleElement.hasAttribute('ynt')) {
                        if (titleElement.getAttribute('ynt') === videoId) {
                            // Check for duplicate or unexpected text nodes (e.g. YouTube injected a new node)
                            const directTextNodes = Array.from(titleElement.childNodes)
                                .filter(node => node.nodeType === Node.TEXT_NODE && node.textContent?.trim());
                            // If there is exactly one text node and it matches the current title, skip processing
                            if (directTextNodes.length === 1 && normalizeText(directTextNodes[0].textContent || '') === normalizeText(titleElement.getAttribute('title') || '')) {
                                continue;
                            } else {
                                // Clean all extension-related attributes if text nodes are out of sync or duplicated
                                titleElement.removeAttribute('ynt');
                                titleElement.removeAttribute('ynt-fail');
                                titleElement.removeAttribute('ynt-fail-retry');
                                titleElement.removeAttribute('ynt-original');
                            }
                        } else {
                            // Clean all extension-related attributes if videoId does not match current ynt attribute
                            titleElement.removeAttribute('ynt');
                            titleElement.removeAttribute('ynt-fail');
                            titleElement.removeAttribute('ynt-fail-retry');
                            titleElement.removeAttribute('ynt-original');
                        }
                    }

                    if (titleElement.hasAttribute('ynt-fail')) {
                        if (titleElement.getAttribute('ynt-fail') === videoId) {
                            const parentTitle = titleElement.parentElement?.getAttribute('title');
                            if (parentTitle){
                                if (normalizeText(titleElement.getAttribute('title')) !== normalizeText(parentTitle)) {
                                    titleElement.setAttribute('title', parentTitle);
                                }
                                if (normalizeText(titleElement.textContent) !== normalizeText(parentTitle)) {
                                    titleElement.textContent = parentTitle;
                                }
                            }
                            continue;
                        }
                        titleElement.removeAttribute('ynt-fail');
                    }

                    if (titleElement.hasAttribute('ynt-original')) {
                        if (titleElement.getAttribute('ynt-original') === videoId) {
                            const parentTitle = titleElement.parentElement?.getAttribute('title');
                            if (parentTitle){
                                if (normalizeText(titleElement.getAttribute('title')) !== normalizeText(parentTitle)) {
                                    titleElement.setAttribute('title', parentTitle);
                                }
                                if (normalizeText(titleElement.textContent) !== normalizeText(parentTitle)) {
                                    titleElement.textContent = parentTitle;
                                }
                            }
                            continue;
                        }
                        titleElement.removeAttribute('ynt-original');
                    }
                    
                    // Try oEmbed API first
                    const apiUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}`;
                    let originalTitle = await titleCache.getOriginalTitle(apiUrl);
                    
                    // If oEmbed fails, try YouTube Data API v3 if enabled and API key available
                    if (!originalTitle && currentSettings?.youtubeDataApi?.enabled && currentSettings?.youtubeDataApi?.apiKey) {
                        
                        try {
                            const youtubeApiUrl = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${currentSettings.youtubeDataApi.apiKey}&part=snippet`;
                            const response = await fetch(youtubeApiUrl);
                            
                            if (response.ok) {
                                const data = await response.json();
                                if (data.items && data.items.length > 0) {
                                    originalTitle = data.items[0].snippet.title;
                                    //browsingTitlesLog(`Retrieved title via YouTube Data API v3 for ${videoId}: ${normalizeText(originalTitle)}`);
                                }
                            } else {
                                browsingTitlesErrorLog(`YouTube Data API v3 failed for ${videoId}: ${response.status} ${response.statusText}`);
                            }
                        } catch (apiError) {
                            browsingTitlesErrorLog(`YouTube Data API v3 error for ${videoId}:`, apiError);
                        }
                    }
                    
                    // If oEmbed (and YouTube Data API if activated) failed, try player API fallback ONLY if BETA option is enabled
                    if (!originalTitle && currentSettings?.youtubeIsolatedPlayerFallback?.titles) {
                        //browsingTitlesLog(`oEmbed failed for ${videoId}, trying player API fallback...`);
                        const fallbackTitle = await getBrowsingTitleFallback(videoId);
                        if (fallbackTitle) {
                            originalTitle = fallbackTitle;
                        }
                        
                        // Add sequential delay only when using player API fallback
                        await new Promise(resolve => setTimeout(resolve, 600));
                    }
                    
                    try {
                        if (!originalTitle && currentSettings?.youtubeIsolatedPlayerFallback?.titles) {
                            // Check if this was already a retry attempt
                            if (titleElement.hasAttribute('ynt-fail-retry')) {
                                // Second failure - mark as permanent fail
                                browsingTitlesErrorLog(`Both oEmbed and fallback failed for ${videoId} after retry, keeping current title: ${normalizeText(currentTitle)}`);
                                titleElement.removeAttribute('ynt-fail-retry');
                                titleElement.setAttribute('ynt-fail', videoId);
                                const parentTitle = titleElement.parentElement?.getAttribute('title');

                                if (!currentTitle) {
                                    if (parentTitle) {
                                        titleElement.textContent = parentTitle;
                                        if (normalizeText(titleElement.getAttribute('title')) !== normalizeText(parentTitle)) {
                                            titleElement.setAttribute('title', parentTitle);
                                        }
                                        browsingTitlesErrorLog(
                                            `No title found for %c${videoId}%c and no title element, restoring title: %c${normalizeText(parentTitle)}%c`,
                                            'color: #4ade80',
                                            'color: #F44336',
                                            'color: white',
                                            'color: #F44336'
                                        );
                                    }
                                } else if (normalizeText(titleElement.getAttribute('title')) !== normalizeText(currentTitle)) {
                                    titleElement.setAttribute('title', currentTitle);
                                }
                                continue;
                            } else {
                                // First failure - allow retry
                                titleElement.setAttribute('ynt-fail-retry', videoId);
                                //browsingTitlesErrorLog(`oEmbed and fallback failed for ${videoId}, marking it for retry.`);
                                continue;
                            }
                        } else if (!originalTitle) {
                            // If we still don't have a title, mark as failed
                            titleElement.setAttribute('ynt-fail', videoId);
                            const parentTitle = titleElement.parentElement?.getAttribute('title');
                            
                            if (!currentTitle) {
                                if (parentTitle) {
                                    titleElement.textContent = parentTitle;
                                    if (normalizeText(titleElement.getAttribute('title')) !== normalizeText(parentTitle)) {
                                        titleElement.setAttribute('title', parentTitle);
                                    }
                                    browsingTitlesErrorLog(
                                        `No title found for %c${videoId}%c and no title element, restoring title: %c${normalizeText(parentTitle)}%c`,
                                        'color: #4ade80', // videoId color
                                        'color: #F44336', // reset color
                                        'color: white',   // parentTitle color
                                        'color: #F44336'  // reset color
                                    );                                    
                                }
                            } else {
                                if (parentTitle){
                                    if (normalizeText(titleElement.getAttribute('title')) !== normalizeText(parentTitle)) {
                                        titleElement.setAttribute('title', parentTitle);
                                    }
                                    if (normalizeText(currentTitle) !== normalizeText(parentTitle)) {
                                        titleElement.textContent = parentTitle;
                                    }
                                }
                                browsingTitlesErrorLog(
                                    `No title found for %c${videoId}%c, keeping current title: %c${normalizeText(currentTitle)}%c`,
                                    'color: #4ade80', // videoId color
                                    'color: #F44336', // reset color
                                    'color: white',   // parentTitle color
                                    'color: #F44336'  // reset color
                                );
                            }
                            continue;
                        }

                        if (normalizeText(currentTitle) === normalizeText(originalTitle)) {
                            //browsingTitlesLog('Title is not translated: ', videoId);
                            titleElement.removeAttribute('ynt');
                            titleElement.setAttribute('ynt-original', videoId);
                            if (normalizeText(titleElement.getAttribute('title')) !== normalizeText(currentTitle)) {
                                titleElement.setAttribute('title', currentTitle);
                            }
                            continue;
                        }
                        //browsingTitlesLog('Title is translated: ', videoId);
                    } catch (error) {
                        //browsingTitlesErrorLog('Failed to get original title for comparison:', error);
                    }                 
                    
                    try {
                        updateBrowsingTitleElement(titleElement, originalTitle, videoId);
                        isTranslated = true;
                    } catch (error) {
                        browsingTitlesErrorLog(`Failed to update recommended title:`, error);
                    }

                    // Process search descriptions if on search page and feature enabled
                    if (isSearchResultsPage() && isTranslated && currentSettings?.descriptionTranslation && (currentSettings?.youtubeIsolatedPlayerFallback?.searchResultsDescriptions || (currentSettings?.youtubeDataApi?.enabled && currentSettings?.youtubeDataApi?.apiKey))) {
                        
                        try {
                            // Find the video element container to get description
                            const videoElement = titleElement.closest('ytd-video-renderer') as HTMLElement;
                            if (videoElement) {
                                const descriptionElement = videoElement.querySelector('.metadata-snippet-text') as HTMLElement;
                                if (descriptionElement) {
                                    // Check if description already processed
                                    const isAlreadyProcessed = descriptionElement.hasAttribute('ynt-search') && 
                                                               descriptionElement.getAttribute('ynt-search') === videoId;
                                    const hasFailed = descriptionElement.hasAttribute('ynt-search-fail') && 
                                                      descriptionElement.getAttribute('ynt-search-fail') === videoId;
                                    
                                    if (!isAlreadyProcessed && !hasFailed) {
                                        try {
                                            let originalDescription: string | null = null;
                                            
                                            // Try YouTube Data API v3 first if enabled and API key available
                                            if (currentSettings?.youtubeDataApi?.enabled && currentSettings?.youtubeDataApi?.apiKey) {
                                                try {
                                                    const youtubeApiUrl = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${currentSettings.youtubeDataApi.apiKey}&part=snippet`;
                                                    const response = await fetch(youtubeApiUrl);
                                                    
                                                    if (response.ok) {
                                                        const data = await response.json();
                                                        if (data.items && data.items.length > 0) {
                                                            originalDescription = data.items[0].snippet.description;
                                                            //descriptionLog(`Retrieved description via YouTube Data API v3 for ${videoId}`);
                                                        }
                                                    } else {
                                                        descriptionErrorLog(`YouTube Data API v3 failed for description ${videoId}: ${response.status} ${response.statusText}`);
                                                    }
                                                } catch (apiError) {
                                                    descriptionErrorLog(`YouTube Data API v3 error for description ${videoId}:`, apiError);
                                                }
                                            }
                                            
                                            // If YouTube Data API failed or not enabled, use player API fallback
                                            if (!originalDescription) {
                                                const playerReady = await ensureIsolatedPlayer('ynt-player-descriptions');
                                                if (playerReady) {
                                                    originalDescription = await fetchSearchDescription(videoId);
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
                            // Handle any errors in description processing
                            descriptionErrorLog(`Failed to process description for ${videoId}:`, error);
                        }
                    }

                } finally {
                    // Always remove the video from processing set when done
                    processingVideos.delete(videoId);
                }
            }
        }
    }

    // Clean up isolated players after processing all videos
    setTimeout(() => {
        cleanupIsolatedPlayer('ynt-player-titles');
        cleanupIsolatedPlayer('ynt-player-descriptions');
    }, 1000);
}