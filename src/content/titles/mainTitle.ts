/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */

import { mainTitleLog, mainTitleErrorLog } from "../../utils/logger";
import { currentSettings } from "../index";
import { normalizeText } from "../../utils/text";
import { waitForElement } from "../../utils/dom";
import { TitleDataEvent } from "../../types/types";
import { titleCache, fetchTitleInnerTube } from "./index";


let mainTitleContentObserver: MutationObserver | null = null;
let pageTitleObserver: MutationObserver | null = null;
let isEmptyObserver: MutationObserver | null = null;
let embedTitleContentObserver: MutationObserver | null = null;
let miniplayerTitleContentObserver: MutationObserver | null = null;
let mainTitleIsUpdating = false;

// --- Utility Functions
export function cleanupMainTitleContentObserver(): void {
    if (mainTitleContentObserver) {
        //mainTitleLog('Cleaning up title content observer');
        mainTitleContentObserver.disconnect();
        mainTitleContentObserver = null;
    }
}

export function cleanupIsEmptyObserver(): void {
    if (isEmptyObserver) {
        //mainTitleLog('Cleaning up is-empty observer');
        isEmptyObserver.disconnect();
        isEmptyObserver = null;
    }
}

export function cleanupPageTitleObserver(): void {
    if (pageTitleObserver) {
        //mainTitleLog('Cleaning up page title observer');
        pageTitleObserver.disconnect();
        pageTitleObserver = null;
    }
}

export function cleanupEmbedTitleContentObserver(): void {
    if (embedTitleContentObserver) {
        //mainTitleLog('Cleaning up embed title content observer');
        embedTitleContentObserver.disconnect();
        embedTitleContentObserver = null;
    }
}

export function cleanupMiniplayerTitleContentObserver(): void {
    if (miniplayerTitleContentObserver) {
        //mainTitleLog('Cleaning up miniplayer title content observer');
        miniplayerTitleContentObserver.disconnect();
        miniplayerTitleContentObserver = null;
    }
}

export function updateMainTitleElement(element: HTMLElement, title: string, videoId: string): void {
    cleanupMainTitleContentObserver();
    cleanupIsEmptyObserver();
    
    mainTitleLog(
        `Updated main title from : %c${normalizeText(element.textContent)}%c to : %c${normalizeText(title)}%c (video id : %c${videoId}%c)`,
        'color: grey',    
        'color: #fcd34d',      
        'color: white',    
        'color: #fcd34d',      
        'color: #4ade80',  
        'color: #fcd34d'       
    );

    
    element.removeAttribute('is-empty');
    element.innerText = title;
    
    // --- Block YouTube from re-adding the is-empty attribute
    isEmptyObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'is-empty') {
                mainTitleLog('Blocking is-empty attribute');
                element.removeAttribute('is-empty');
                element.innerText = title;
            }
        });
    });

    isEmptyObserver.observe(element, {
        attributes: true,
        attributeFilter: ['is-empty']
    });
    
    // --- Block YouTube from adding multiple text nodes
    mainTitleContentObserver = new MutationObserver((mutations) => {
        if (mainTitleIsUpdating) return;
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                // --- Check if there are multiple text nodes
                const textNodes = Array.from(element.childNodes)
                    .filter(node => node.nodeType === Node.TEXT_NODE);
                
                if (textNodes.length > 1) {
                    mainTitleIsUpdating = true;
                    element.innerText = title;
                    mainTitleIsUpdating = false;
                    mainTitleLog('Multiple text nodes detected, cleaning up');
                }
            }
        });
    });

    mainTitleContentObserver.observe(element, {
        childList: true
    });

    titleCache.setElement(element, title);
}

function updatePageTitle(mainTitle: string): void {
    cleanupPageTitleObserver();
    
    const expectedTitle = `${mainTitle} - YouTube`;
    mainTitleLog(
        `Updated page title from : %c${normalizeText(document.title)}%c to : %c${normalizeText(expectedTitle)}`,
        'color: grey',    
        'color: #fcd34d',      
        'color: white'
    );
    document.title = expectedTitle;
    
    const titleElement = document.querySelector('title');
    if (titleElement) {
        pageTitleObserver = new MutationObserver(() => {
            if (normalizeText(document.title) !== normalizeText(expectedTitle)) {
                mainTitleLog('YouTube changed page title, reverting');
                //mainTitleLog('Current:', normalizeText(document.title));
                //mainTitleLog('Expected:', normalizeText(expectedTitle));
                document.title = expectedTitle;
            }
        });
        
        pageTitleObserver.observe(titleElement, { 
            childList: true 
        });
    }
}

function updateEmbedTitleElement(element: HTMLElement, title: string, videoId: string): void {
    cleanupEmbedTitleContentObserver();
    
    mainTitleLog(
        `Updated embed title from : %c${normalizeText(element.textContent)}%c to : %c${normalizeText(title)}%c (video id : %c${videoId}%c)`,
        'color: grey',    
        'color: #fcd34d',      
        'color: white',    
        'color: #fcd34d',      
        'color: #4ade80',  
        'color: #fcd34d'       
    );
    
    element.innerText = title;
    
    // Block YouTube from changing the embed title back
    embedTitleContentObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList' || mutation.type === 'characterData') {
                const currentText = element.textContent;
                if (normalizeText(currentText) !== normalizeText(title)) {
                    mainTitleLog('YouTube changed embed title, reverting');
                    element.innerText = title;
                }
            }
        });
    });

    embedTitleContentObserver.observe(element, {
        childList: true,
        characterData: true,
        subtree: true
    });

    titleCache.setElement(element, title);
}

function updateMiniplayerTitleElement(element: HTMLElement, title: string, videoId: string): void {
    cleanupMiniplayerTitleContentObserver();
    
    mainTitleLog(
        `Updated miniplayer title from : %c${normalizeText(element.textContent)}%c to : %c${normalizeText(title)}%c (video id : %c${videoId}%c)`,
        'color: grey',    
        'color: #fcd34d',      
        'color: white',    
        'color: #fcd34d',      
        'color: #4ade80',  
        'color: #fcd34d'       
    );
    
    element.innerText = title;
    
    // Block YouTube from changing the miniplayer title back
    miniplayerTitleContentObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList' || mutation.type === 'characterData') {
                const currentText = element.textContent;
                if (normalizeText(currentText) !== normalizeText(title)) {
                    mainTitleLog('YouTube changed miniplayer title, reverting');
                    element.innerText = title;
                }
            }
        });
    });

    miniplayerTitleContentObserver.observe(element, {
        childList: true,
        characterData: true,
        subtree: true
    });

    titleCache.setElement(element, title);
}

// --- Main Title Function
export async function refreshMainTitle(): Promise<void> {
    const mainTitle = document.querySelector('h1.ytd-watch-metadata > yt-formatted-string') as HTMLElement;
    if (mainTitle && window.location.pathname === '/watch' && !titleCache.hasElement(mainTitle)) {
        //mainTitleLog('Processing main title element');
        const videoId = new URLSearchParams(window.location.search).get('v');
        if (videoId) {
            const currentTitle = mainTitle.textContent;

            const originalTitle = await fetchMainTitle(videoId, true);

            if (!originalTitle) {
                mainTitleLog('Failed to get original title, keeping current');
                return;
            }

            // Skip if title is already correct and doesn't have is-empty attribute
            if (normalizeText(currentTitle) === normalizeText(originalTitle) && !mainTitle.hasAttribute('is-empty')) {
                mainTitleLog('Main title is already original');
                return;
            }

            // Apply the original title
            try {
                updateMainTitleElement(mainTitle, originalTitle, videoId);
                updatePageTitle(originalTitle);
            } catch (error) {
                mainTitleErrorLog(`Failed to update main title:`, error);
            }
        }
    }
}



// --- Embed Title Function (Fullscreen and Embed Pages)
export async function refreshEmbedTitle(): Promise<void> {
    // Clean up existing observer first
    cleanupEmbedTitleContentObserver();
    
    // Wait for the embed title element to be available
    try {
        const embedTitle = await waitForElement('.ytp-title-link') as HTMLElement;
        
        if (embedTitle && !titleCache.hasElement(embedTitle)) {
            //mainTitleLog('Processing embed title element');
            
            // Get video ID from pathname or URL parameters
            let videoId: string | null = null;
            
            if (window.location.pathname.startsWith('/embed/')) {
                // Embed page: get ID from pathname
                videoId = window.location.pathname.split('/embed/')[1];
            } else if (window.location.pathname === '/watch') {
                // Watch page (including fullscreen): get ID from URL parameters
                videoId = new URLSearchParams(window.location.search).get('v');
            }
            
            if (videoId) {
                const currentTitle = embedTitle.textContent;

                const originalTitle = await fetchMainTitle(videoId, true);

                if (!originalTitle) {
                    mainTitleLog('Failed to get original title, keeping current');
                    return;
                }

                // Skip if title is already correct
                if (normalizeText(currentTitle) === normalizeText(originalTitle)) {
                    return;
                }

                // Apply the original title
                try {
                    updateEmbedTitleElement(embedTitle, originalTitle, videoId);
                    updatePageTitle(originalTitle);
                } catch (error) {
                    mainTitleErrorLog(`Failed to update embed title:`, error);
                }
            }
        }
    } catch (error) {
        // Element not found or timeout, silently fail as it's expected behavior
        //mainTitleLog('Embed title element not found or timeout');
    }
}

// --- Miniplayer Title Function
export async function refreshMiniplayerTitle(): Promise<void> {
    // Clean up existing observer first
    cleanupMiniplayerTitleContentObserver();
    
    // Wait for the miniplayer title element to be available
    try {
        const miniplayerTitle = await waitForElement('.miniplayer-title.style-scope.ytd-miniplayer') as HTMLElement;

        // Wait for the element to have content (YouTube might load the element before filling it)
        let attempts = 0;
        const maxAttempts = 10; // 5 seconds total (10 * 500ms)

        while ((!miniplayerTitle.textContent || miniplayerTitle.textContent.trim() === '') && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 500));
            attempts++;
        }
        
        // If still no content after waiting, skip
        if (!miniplayerTitle.textContent || miniplayerTitle.textContent.trim() === '') {
            return;
        }

        if (miniplayerTitle && !titleCache.hasElement(miniplayerTitle)) {
            // Get video ID from miniplayer - try multiple methods
            let videoId: string | null = null;
            
            // Method 1: Try to find video link in miniplayer
            const miniplayerContainer = document.querySelector('ytd-miniplayer');
            if (miniplayerContainer) {
                const videoLink = miniplayerContainer.querySelector('a[href*="/watch?v="]') as HTMLAnchorElement;
                if (videoLink) {
                    const urlParams = new URL(videoLink.href).searchParams;
                    videoId = urlParams.get('v');
                }
            }
            
            // Method 2: Fallback to current URL if still on /watch page
            if (!videoId && window.location.pathname === '/watch') {
                videoId = new URLSearchParams(window.location.search).get('v');
            }

            // Method 3: Try to extract from player if available
            if (!videoId) {
                try {
                    // Look for video ID in any ytd-miniplayer attributes or data
                    const miniplayerElement = miniplayerTitle.closest('ytd-miniplayer');
                    if (miniplayerElement) {
                        // Check if there's any data attribute with video ID
                        const allAttributes = Array.from(miniplayerElement.attributes);
                        for (const attr of allAttributes) {
                            if (attr.value && attr.value.match(/^[a-zA-Z0-9_-]{11}$/)) {
                                videoId = attr.value;
                                break;
                            }
                        }
                    }
                } catch (error) {
                    // Silent fail for attribute extraction
                }
            }

            if (videoId) {

                const originalTitle = await fetchMainTitle(videoId, false);

                if (!originalTitle) {
                    mainTitleLog('Failed to get original title, keeping current');
                    return;
                }

                // Get current title just before comparison to avoid race conditions
                const currentTitle = miniplayerTitle.textContent;
                
                // Skip if title is already correct
                if (normalizeText(currentTitle) === normalizeText(originalTitle)) {
                    return;
                }

                // Apply the original title
                try {
                    updateMiniplayerTitleElement(miniplayerTitle, originalTitle, videoId);
                    updatePageTitle(originalTitle);
                } catch (error) {
                    mainTitleErrorLog(`Failed to update miniplayer title:`, error);
                }
            }
        }
    } catch (error) {
        // Element not found or timeout, silently fail as it's expected behavior
    }
}


export async function fetchMainTitle(videoId: string, fallbackToPageTitle: boolean = true, isShorts: boolean = false): Promise<string | null> {
    let originalTitle: string | null = null;

    // First try: Get title from player
    try {
        const mainTitleScript = document.createElement('script');
        mainTitleScript.type = 'text/javascript';
        mainTitleScript.src = browser.runtime.getURL('dist/content/scripts/mainTitleScript.js');

        // Set up event listener before injecting script
        const playerTitle = await new Promise<string | null>((resolve) => {
            const titleListener = (event: TitleDataEvent) => {
                window.removeEventListener('ynt-title-data', titleListener as EventListener);
                resolve(event.detail.title);
            };
            window.addEventListener('ynt-title-data', titleListener as EventListener);
            
            // Inject script after listener is ready
            document.head.appendChild(mainTitleScript);
        });

        if (playerTitle) {
            originalTitle = playerTitle;
        }
    } catch (error) {
        mainTitleErrorLog('Failed to get title from player:', error);
    }

    // Second try: Fallback to oembed API
    if (!originalTitle) {
        mainTitleLog('Falling back to oembed API');
        const oembedUrl = isShorts ? `https://www.youtube.com/oembed?url=https://www.youtube.com/shorts/${videoId}` : `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}`;
        originalTitle = await titleCache.getOriginalTitle(oembedUrl);
    }

    // Try InnerTube API if oEmbed fails
    if (!originalTitle) {
        //mainTitleErrorLog(`Oembed api failed, fetching title from InnerTube API for ${videoId}`);
        try {
            originalTitle = await fetchTitleInnerTube(videoId) ?? '';
        } catch (error) {
            mainTitleErrorLog(`InnerTube API error for ${videoId}:`, error);
        }
    }

    // Third try: YouTube Data API v3 if enabled
    if (!originalTitle && currentSettings?.youtubeDataApi?.enabled && currentSettings?.youtubeDataApi?.apiKey) {
        try {
            const youtubeApiUrl = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${currentSettings.youtubeDataApi.apiKey}&part=snippet`;
            const response = await fetch(youtubeApiUrl);
            
            if (response.ok) {
                const data = await response.json();
                if (data.items && data.items.length > 0) {
                    originalTitle = data.items[0].snippet.title;
                }
            } else {
                mainTitleLog(`YouTube Data API v3 failed for ${videoId}: ${response.status} ${response.statusText}`);
            }
        } catch (apiError) {
            mainTitleErrorLog(`YouTube Data API v3 error for ${videoId}:`, apiError);
        }
    }

    // Last resort: Use page title if allowed
    if (!originalTitle && fallbackToPageTitle) {
        const currentPageTitle = document.title.replace(/ - YouTube$/, '');
        if (currentPageTitle.length > 0) {
            originalTitle = currentPageTitle;
            mainTitleLog('Failed to get original title using APIs, using page title as last resort');
        }
    }

    return originalTitle;
}