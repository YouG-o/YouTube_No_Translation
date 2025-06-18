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
const TITLES_THROTTLE = 2000;
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
    
    // Clean ALL previous attributes and spans before applying new ones
    element.removeAttribute('ynt');
    element.removeAttribute('ynt-fail');
    element.removeAttribute('ynt-fail-retry');
    element.removeAttribute('ynt-original');
    element.removeAttribute('title');
    
    // Remove ALL existing span elements
    const existingSpans = element.querySelectorAll('span[ynt-span]');
    existingSpans.forEach(span => span.remove());
    
    browsingTitlesLog(
        `Updated title from : %c${normalizeText(element.textContent)}%c to : %c${normalizeText(title)}%c (video id : %c${videoId}%c)`,
        'color: grey',    // --- currentTitle style
        'color: #fca5a5',      // --- reset color
        'color: white',    // --- originalTitle style
        'color: #fca5a5',      // --- reset color
        'color: #4ade80',  // --- videoId style (light green)
        'color: #fca5a5'       // --- reset color
    );
    
    // --- Inject CSS if not already done
    if (!document.querySelector('#ynt-style')) {
        const style = document.createElement('style');
        style.id = 'ynt-style';
        style.textContent = `
            /* Hide all direct children of video titles with ynt attribute (basically hide the translated title) */
            #video-title[ynt] > * {
                display: none !important;
            }

            /* Show the untranslated title using the title attribute */
            #video-title[ynt]::after {
                content: attr(title);
                font-size: var(--ytd-tab-system-font-size-body);
                line-height: var(--ytd-tab-system-line-height-body);
                font-family: var(--ytd-tab-system-font-family);
            }
        `;
        document.head.appendChild(style);
    }

    const createSpan = (element: HTMLElement, videoId: string): void => {
        const span = document.createElement('span');
        span.setAttribute('ynt-span', videoId);
        span.textContent = element.textContent;
        element.textContent = '';
        element.appendChild(span);
    }

    let span = element.querySelector(`span[ynt-span="${videoId}"]`);
    if (!span) {
        createSpan(element, videoId);
    }

    element.setAttribute('title', title);
    element.setAttribute('ynt', videoId);

    // --- Add observer to update span with latest text
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                const directTextNodes = Array.from(element.childNodes)
                    .filter(node => node.nodeType === Node.TEXT_NODE);
                
                if (directTextNodes.length > 0) {
                    browsingTitlesLog('Mutiple title detected, updating hidden span');
                    let span = element.querySelector(`span[ynt-span="${videoId}"]`);
                    if (span) {
                        // --- Get last added text node
                        const lastTextNode = directTextNodes[directTextNodes.length - 1];
                        span.textContent = lastTextNode.textContent;
                        // --- Remove all direct text nodes
                        directTextNodes.forEach(node => node.remove());
                    } else if (!span) {
                        createSpan(element, videoId);
                    }
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

        // Mark that we're about to initiate a browsing titles change
        markBrowsingTitlesChange();
        
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

// --- Other Titles Function
async function refreshBrowsingTitles(): Promise<void> {
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
                    const currentTitle = titleElement.textContent;

                    // Check if already processed successfully - BEFORE making API calls
                    if (titleElement.hasAttribute('ynt')) {
                        if (titleElement.getAttribute('ynt') === videoId) {
                            let span = titleElement.querySelector(`span[ynt-span="${videoId}"]`);
                            if (span) {
                                // Check if there are direct text nodes that shouldn't be there
                                const directTextNodes = Array.from(titleElement.childNodes)
                                    .filter(node => node.nodeType === Node.TEXT_NODE && node.textContent?.trim());
                                
                                if (directTextNodes.length === 0) {
                                    continue;
                                }
                            }
                        } else {
                            titleElement.removeAttribute('ynt');
                        }
                    }

                    if (titleElement.hasAttribute('ynt-fail')) {
                        if (titleElement.getAttribute('ynt-fail') === videoId) {
                            continue;
                        }
                        titleElement.removeAttribute('ynt-fail');
                    }
                    if (titleElement.hasAttribute('ynt-original')) {
                        if (titleElement.getAttribute('ynt-original') === videoId) {
                            continue;
                        }
                        titleElement.removeAttribute('ynt-original');
                    }
                    
                    // Try oEmbed API first
                    const apiUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}`;
                    let originalTitle = await titleCache.getOriginalTitle(apiUrl);
                    
                    // If oEmbed fails, try fallback ONLY if BETA option is enabled
                    if (!originalTitle && currentSettings?.titlesFallbackApi) {
                        //browsingTitlesLog(`oEmbed failed for ${videoId}, trying player API fallback...`);
                        const fallbackTitle = await getBrowsingTitleFallback(videoId);
                        if (fallbackTitle) {
                            originalTitle = fallbackTitle;
                        }
                        
                        // Add sequential delay only when using player API fallback
                        await new Promise(resolve => setTimeout(resolve, 600));
                    }
                    
                    try {
                        if (!originalTitle && currentSettings?.titlesFallbackApi) {
                            // Check if this was already a retry attempt
                            if (titleElement.hasAttribute('ynt-fail-retry')) {
                                // Second failure - mark as permanent fail
                                browsingTitlesErrorLog(`Both oEmbed and fallback failed for ${videoId} after retry, keeping current title: ${normalizeText(currentTitle)}`);
                                titleElement.removeAttribute('ynt-fail-retry');
                                titleElement.setAttribute('ynt-fail', videoId);
                                currentTitle && titleElement.setAttribute('title', currentTitle);
                                continue;
                            } else {
                                // First failure - allow retry
                                titleElement.setAttribute('ynt-fail-retry', videoId);
                                //browsingTitlesErrorLog(`oEmbed and fallback failed for ${videoId}, marking it for retry.`);
                                continue;
                            }
                        } else if (!originalTitle) {
                            // If we still don't have a title, mark as failed
                            browsingTitlesErrorLog(`No title found for ${videoId}, keeping current title: ${normalizeText(currentTitle)}`);
                            titleElement.setAttribute('ynt-fail', videoId);
                            currentTitle && titleElement.setAttribute('title', currentTitle);
                            continue;
                        }

                        if (normalizeText(currentTitle) === normalizeText(originalTitle)) {
                            //browsingTitlesLog('Title is not translated: ', videoId);
                            titleElement.removeAttribute('ynt');
                            titleElement.setAttribute('ynt-original', videoId);
                            currentTitle && titleElement.setAttribute('title', currentTitle);
                            continue;
                        }
                        
                        if (normalizeText(titleElement.getAttribute('title')) === normalizeText(originalTitle)) {
                            titleElement.setAttribute('ynt', videoId);
                            continue;
                        }
                        //browsingTitlesLog('Title is translated: ', videoId);
                    } catch (error) {
                        //browsingTitlesErrorLog('Failed to get original title for comparison:', error);
                    }                 
                    
                    try {
                        updateBrowsingTitleElement(titleElement, originalTitle, videoId);
                    } catch (error) {
                        browsingTitlesErrorLog(`Failed to update recommended title:`, error);
                    }
                } finally {
                    // Always remove the video from processing set when done
                    processingVideos.delete(videoId);
                }
            }
        }
    }
}