/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */

import { browsingTitlesLog, browsingTitlesErrorLog, mainTitleLog, mainTitleErrorLog } from "../../utils/logger";
import { TitleDataEvent } from "../../types/types";
import { waitForElement } from "../../utils/dom";
import { normalizeText } from "../../utils/text";
import { extractVideoIdFromUrl } from "../../utils/video";

import { updateMainTitleElement, fetchMainTitle } from "./mainTitle";
import { fetchOriginalTitle, lastBrowsingShortsRefresh, setLastBrowsingShortsRefresh, TITLES_THROTTLE } from "./browsingTitles";
import { titleCache } from "./index";



// --- Shorts Title Function
export async function refreshShortMainTitle(): Promise<void> {
    // Get the shorts title element
    const shortTitle = document.querySelector('yt-shorts-video-title-view-model h2.ytShortsVideoTitleViewModelShortsVideoTitle span') as HTMLElement;
    
    // Get the linked video title element (additional title to translate)
    const linkedVideoTitle = document.querySelector('.ytReelMultiFormatLinkViewModelTitle span') as HTMLElement;
    
    if (window.location.pathname.startsWith('/shorts')) {
        //mainTitleLog('Processing shorts title elements');
        
        const videoId = extractVideoIdFromUrl(window.location.href);
        
        if (videoId) {
            // Process main shorts title
            if (shortTitle && !titleCache.hasElement(shortTitle)) {
                const currentTitle = shortTitle.textContent;

                const originalTitle = await fetchMainTitle(videoId, false, true);

                // Skip if title is already correct
                if (!originalTitle || normalizeText(currentTitle) === normalizeText(originalTitle)) {
                    //mainTitleLog('Main shorts title already correct or could not be retrieved');
                } else {
                    // Apply the original title
                    try {
                        updateMainTitleElement(shortTitle, originalTitle, videoId);
                        // No need to update page title for shorts
                    } catch (error) {
                        mainTitleErrorLog(`Failed to update shorts title:`, error);
                    }
                }
            }
            
            // Process linked video title (if present)
            if (linkedVideoTitle) {
                const currentLinkedTitle = linkedVideoTitle.textContent;
                
                // Get the linked video ID from the parent anchor element
                const linkedVideoAnchor = linkedVideoTitle.closest('a.ytReelMultiFormatLinkViewModelEndpoint') as HTMLAnchorElement;
                if (linkedVideoAnchor) {
                    const linkedVideoUrl = linkedVideoAnchor.getAttribute('href');
                    if (linkedVideoUrl) {
                        const linkedVideoId = extractVideoIdFromUrl(`https://www.youtube.com${linkedVideoUrl}`);
                        
                        if (linkedVideoId) {
                           // mainTitleLog(`Processing linked video title with ID: ${linkedVideoId}`);
                            
                            // Using only oembed API for linked video as mentioned
                            const linkedOriginalTitle = await titleCache.getOriginalTitle(
                                `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${linkedVideoId}`
                            );
                            
                            if (linkedOriginalTitle && normalizeText(currentLinkedTitle) !== normalizeText(linkedOriginalTitle)) {
                                try {
                                    updateMainTitleElement(linkedVideoTitle, linkedOriginalTitle, linkedVideoId);
                                } catch (error) {
                                    mainTitleErrorLog(`Failed to update linked video title:`, error);
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}


export const checkShortsId = () => {
    if (window.location.pathname.startsWith('/shorts')) {
        waitForElement('yt-shorts-video-title-view-model h2.ytShortsVideoTitleViewModelShortsVideoTitle span')
        .then(() => {
            const currentVideoId = extractVideoIdFromUrl(window.location.href);
            
            if (currentVideoId) {
                mainTitleLog('Shorts ID changed, updating title for ID:', currentVideoId);
                
                // Setup multiple refresh attempts with increasing delays
                const delays = [50, 150, 300, 500];
                
                delays.forEach(delay => {
                    setTimeout(() => {
                        // Only refresh if we're still on the same video
                        const newVideoId = extractVideoIdFromUrl(window.location.href);
                        
                        if (window.location.pathname.startsWith('/shorts') && newVideoId === currentVideoId) {
                            //mainTitleLog(`Refreshing shorts title after ${delay}ms delay`);
                            refreshShortMainTitle();
                        }
                    }, delay);
                });
            }
        });
    }
};

// Handle alternative shorts format with different HTML structure
export async function refreshShortsAlternativeFormat(): Promise<void> {
    const now = Date.now();
    if (now - lastBrowsingShortsRefresh < TITLES_THROTTLE) {
        return;
    }
    setLastBrowsingShortsRefresh(now);

    // Target the specific structure used for alternative shorts display
    const shortsLinks = document.querySelectorAll('.shortsLockupViewModelHostEndpoint') as NodeListOf<HTMLAnchorElement>;
    
    for (const shortLink of shortsLinks) {
        try {
            // Check if we've already processed this element correctly
            if (shortLink.hasAttribute('ynt')) {
                const currentTitle = shortLink.querySelector('span')?.textContent;
                const storedTitle = shortLink.getAttribute('title');
                
                // If the current displayed title and stored title attribute match, no need to update
                if (currentTitle && storedTitle && 
                    normalizeText(currentTitle) === normalizeText(storedTitle)) {
                    continue;
                }
            }
            
            // Extract video ID from href
            const href = shortLink.getAttribute('href');
            if (!href || !href.includes('/shorts/')) {
                continue;
            }
            
            const videoId = extractVideoIdFromUrl(`https://www.youtube.com${href}`);
            if (!videoId) {
                continue;
            }
            
            // Find the title span element
            const titleSpan = shortLink.querySelector('span');
            if (!titleSpan) {
                continue;
            }
            
            const currentTitle = titleSpan.textContent;
            const titleFetchResult = await fetchOriginalTitle(videoId, shortLink, currentTitle || '');
            const originalTitle = titleFetchResult.originalTitle;
            if (!originalTitle) {
                browsingTitlesLog(`Failed to get original title from API for short: ${videoId}, keeping current title : ${normalizeText(currentTitle)}`);
                continue;
            }
            
            if (!originalTitle) {
                browsingTitlesLog(`Failed to get original title from API for short: ${videoId}, keeping current title : ${normalizeText(currentTitle)}`);
                continue;
            }
            
            if (normalizeText(currentTitle) === normalizeText(originalTitle)) {
                // Already showing correct title, no need to modify
                titleCache.setElement(shortLink, originalTitle);
                continue;
            }
            
            // Update the title
            browsingTitlesLog(
                `Updated shorts title from: %c${normalizeText(currentTitle)}%c to: %c${normalizeText(originalTitle)}%c (short id: %c${videoId}%c)`,
                'color: grey',
                'color: #fca5a5',
                'color: white; background: rgba(0,0,0,0.5); padding:2px 4px; border-radius:3px;',
                'color: #fca5a5',
                'color: #4ade80',
                'color: #fca5a5'
            );
            
            // Set the original title
            titleSpan.textContent = originalTitle;
            shortLink.setAttribute('title', originalTitle);
            shortLink.setAttribute('ynt', videoId);
            titleCache.setElement(shortLink, originalTitle);
            
        } catch (error) {
            browsingTitlesErrorLog('Error processing alternative shorts format:', error);
        }
    }
}