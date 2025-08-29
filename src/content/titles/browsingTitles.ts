/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */

import { browsingTitlesLog, browsingTitlesErrorLog, titlesLog } from '../../utils/logger';
import { ProcessingResult, ElementProcessingState, TitleFetchResult } from '../../types/types';
import { currentSettings } from '../index';
import { normalizeText } from '../../utils/text';
import { extractVideoIdFromUrl } from '../../utils/video';
import { isYouTubeDataAPIEnabled } from '../../utils/utils';
import { shouldProcessSearchDescriptionElement, batchProcessSearchDescriptions } from '../description/searchDescriptions';
import { titleCache, fetchTitleInnerTube, fetchTitleOembed } from './index';


// --- Global variables
let browsingTitlesObserver = new Map<HTMLElement, MutationObserver>();
let lastBrowsingTitlesRefresh = 0;
export let lastBrowsingShortsRefresh = 0;
export function setLastBrowsingShortsRefresh(value: number) {
    lastBrowsingShortsRefresh = value;
}
export const TITLES_THROTTLE = 500;
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

export function cleanupAllBrowsingTitlesElementsObservers(): void {
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

export function updateBrowsingTitleElement(element: HTMLElement, title: string, videoId: string, isBrowsingTitle: boolean = true): void {
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
    
    if (isBrowsingTitle) {
        browsingTitlesLog(
            `Updated title from : %c${normalizeText(previousTitle)}%c to : %c${normalizeText(title)}%c (video id : %c${videoId}%c)`,
            'color: grey',
            'color: #fca5a5',
            'color: white; background: rgba(0,0,0,0.5); padding:2px 4px; border-radius:3px;',
            'color: #fca5a5',
            'color: #4ade80',
            'color: #fca5a5'
        );
    } else {
        titlesLog(
            `Updated title from : %c${normalizeText(previousTitle)}%c to : %c${normalizeText(title)}%c (video id : %c${videoId}%c)`,
            'color: grey',
            'color: #fca5a5',
            'color: white; background: rgba(0,0,0,0.5); padding:2px 4px; border-radius:3px;',
            'color: #fca5a5',
            'color: #4ade80',
            'color: #fca5a5'
        );
    }
    
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
}


function shouldProcessBrowsingElement(titleElement: HTMLElement): ProcessingResult {
    // Skip DeArrow custom titles to avoid conflicts
    if (titleElement.classList.contains('cbCustomTitle')) {
        return { shouldProcess: false };
    }
    
    const videoUrl = titleElement.closest('a')?.href;
    
    if (!videoUrl) {
        return { shouldProcess: false };
    }

    // Check for playlist containers (legacy and new format)
    const hasPlaylistParam = videoUrl.includes('list=') && !videoUrl.includes('&index=');

    const isRichGridPlaylist =
        titleElement.closest('ytd-rich-grid-media') !== null && hasPlaylistParam;

    // New format: check if parent link has 'list=' but not 'index='
    const parentLink = titleElement.closest('a.yt-lockup-metadata-view-model__title, a.yt-lockup-metadata-view-model-wiz__title') as HTMLAnchorElement | null;
    const isPlaylistAlternativeContainer = !!parentLink && parentLink.getAttribute('href')?.includes('list=') && 
                               !parentLink.getAttribute('href')?.includes('index=');

    // Additional: channel grid and other playlist renderers loaded on scroll
    const isInKnownPlaylistRenderer =
        !!titleElement.closest('ytd-grid-playlist-renderer, ytd-playlist-renderer, ytd-compact-playlist-renderer, ytd-playlist-panel-renderer');

    // Additional: anchor with id="video-title" belonging to a grid playlist renderer
    const anchor = titleElement.closest('a#video-title') as HTMLAnchorElement | null;
    const anchorIsGridPlaylistLink = !!anchor && anchor.classList.contains('ytd-grid-playlist-renderer');

    const isPlaylistContainer =
        isRichGridPlaylist ||
        isPlaylistAlternativeContainer ||
        (hasPlaylistParam && (isInKnownPlaylistRenderer || anchorIsGridPlaylistLink));

    if (isPlaylistContainer) {
        // Clean up any attributes the extension might have previously set incorrectly on this element
        titleElement.removeAttribute('ynt-fail');
        titleElement.removeAttribute('ynt-original');
        titleElement.removeAttribute('ynt');
        // Ensure the browser tooltip (title attribute) matches the visible text if it was changed
        if (titleElement.textContent && titleElement.getAttribute('title') !== titleElement.textContent) {
            titleElement.setAttribute('title', titleElement.textContent);
        }
        return { shouldProcess: false };
    }

    const videoId = extractVideoIdFromUrl(videoUrl);
    
    if (!videoId) {
        return { shouldProcess: false };
    }

    // Skip if this video is currently being processed
    if (processingVideos.has(videoId)) {
        return { shouldProcess: false };
    }

    return { 
        shouldProcess: true, 
        videoId, 
        videoUrl 
    };
}


function checkElementProcessingState(titleElement: HTMLElement, videoId: string): ElementProcessingState {
    // Check if already processed successfully - BEFORE making API calls
    if (titleElement.hasAttribute('ynt')) {
        if (titleElement.getAttribute('ynt') === videoId) {
            // Check for duplicate or unexpected text nodes (e.g. YouTube injected a new node)
            const directTextNodes = Array.from(titleElement.childNodes)
                .filter(node => node.nodeType === Node.TEXT_NODE && node.textContent?.trim());
            // If there is exactly one text node and it matches the current title, skip processing
            if (directTextNodes.length === 1 && normalizeText(directTextNodes[0].textContent || '') === normalizeText(titleElement.getAttribute('title') || '')) {
                return { shouldSkip: true, shouldClean: false };
            } else {
                // Clean all extension-related attributes if text nodes are out of sync or duplicated
                return { shouldSkip: false, shouldClean: true };
            }
        } else {
            // Clean all extension-related attributes if videoId does not match current ynt attribute
            return { shouldSkip: false, shouldClean: true };
        }
    }

    if (titleElement.hasAttribute('ynt-fail')) {
        if (titleElement.getAttribute('ynt-fail') === videoId) {
            const parentTitle = titleElement.parentElement?.getAttribute('title');
            if (parentTitle) {
                if (normalizeText(titleElement.getAttribute('title')) !== normalizeText(parentTitle)) {
                    titleElement.setAttribute('title', parentTitle);
                }
                if (normalizeText(titleElement.textContent) !== normalizeText(parentTitle)) {
                    titleElement.textContent = parentTitle;
                }
            }
            return { shouldSkip: true, shouldClean: false };
        }
        titleElement.removeAttribute('ynt-fail');
    }

    if (titleElement.hasAttribute('ynt-original')) {
        if (titleElement.getAttribute('ynt-original') === videoId) {
            const parentTitle = titleElement.parentElement?.getAttribute('title');
            if (parentTitle) {
                if (normalizeText(titleElement.getAttribute('title')) !== normalizeText(parentTitle)) {
                    titleElement.setAttribute('title', parentTitle);
                }
                if (normalizeText(titleElement.textContent) !== normalizeText(parentTitle)) {
                    titleElement.textContent = parentTitle;
                }
            }
            return { shouldSkip: true, shouldClean: false };
        }
        titleElement.removeAttribute('ynt-original');
    }

    return { shouldSkip: false, shouldClean: false };
}


// New function to batch fetch titles from YouTube Data API v3
async function batchFetchTitlesFromYouTubeDataApi(videoIds: string[]): Promise<Map<string, string>> {
    const titleMap = new Map<string, string>();

    if (!isYouTubeDataAPIEnabled(currentSettings)) {
        return titleMap;
    }

    // Process in batches of 50 (YouTube Data API v3 limit)
    const batchSize = 50;
    for (let i = 0; i < videoIds.length; i += batchSize) {
        const batch = videoIds.slice(i, i + batchSize);
        const idsParam = batch.join(',');
        
        try {
            const youtubeApiUrl = `https://www.googleapis.com/youtube/v3/videos?id=${idsParam}&key=${currentSettings?.youtubeDataApi.apiKey}&part=snippet`;
            const response = await fetch(youtubeApiUrl);
            
            if (response.ok) {
                const data = await response.json();
                if (data.items) {
                    data.items.forEach((item: any) => {
                        if (item.snippet?.title) {
                            titleMap.set(item.id, item.snippet.title);
                        }
                    });
                }
            } else {
                browsingTitlesErrorLog(`YouTube Data API v3 batch failed: ${response.status} ${response.statusText}`);
            }
        } catch (apiError) {
            browsingTitlesErrorLog(`YouTube Data API v3 batch error:`, apiError);
        }
    }
    
    return titleMap;
}

// Modified function with new signature to accept pre-fetched titles
export async function fetchOriginalTitle(
    videoId: string, 
    titleElement: HTMLElement, 
    currentTitle: string,
    preferenceFetchedTitles?: Map<string, string>
): Promise<TitleFetchResult> {
    let originalTitle: string | null = null;
    
    // Check cache first
    originalTitle = titleCache.getTitle(videoId) || null;
    if (originalTitle) {
        //browsingTitlesLog(`Found title in cache for ${videoId}: %c${normalizeText(originalTitle)}%c`, 'color: #4ade80', 'color: #F44336');
    } 

    // Check pre-fetched titles (from YouTube Data API v3 batch)    
    if (!originalTitle && preferenceFetchedTitles?.has(videoId)) {
            originalTitle = preferenceFetchedTitles.get(videoId) || null;
    }
    
    // Try oEmbed API if not found in pre-fetched
    if (!originalTitle) {
        try {
            originalTitle = await fetchTitleOembed(videoId) || null;
        } catch (error) {
            browsingTitlesErrorLog(`oEmbed API error for ${videoId}:`, error);
        }
    }
    
    // Try InnerTube API if oEmbed fails
    if (!originalTitle) {
        try {
            originalTitle = await fetchTitleInnerTube(videoId) || null;
        } catch (error) {
            browsingTitlesErrorLog(`InnerTube API error for ${videoId}:`, error);
        }
    }
    
    if (!originalTitle) {
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
                    'color: #4ade80',
                    'color: #F44336',
                    'color: white',
                    'color: #F44336'
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
                'color: #4ade80',
                'color: #F44336',
                'color: white',
                'color: #F44336'
            );
        }
        return { originalTitle: null, shouldSkip: true, shouldMarkAsOriginal: false, shouldMarkAsFailed: true };
    }

    // Check if title is original (not translated)
    if (normalizeText(currentTitle) === normalizeText(originalTitle)) {
        titleElement.removeAttribute('ynt');
        titleElement.setAttribute('ynt-original', videoId);
        if (normalizeText(titleElement.getAttribute('title')) !== normalizeText(currentTitle)) {
            titleElement.setAttribute('title', currentTitle);
        }
        return { originalTitle, shouldSkip: true, shouldMarkAsOriginal: true, shouldMarkAsFailed: false };
    }
    
    // Cache the fetched title
    titleCache.setTitle(videoId, originalTitle);

    return { originalTitle, shouldSkip: false, shouldMarkAsOriginal: false, shouldMarkAsFailed: false };
}

export async function refreshBrowsingVideos(): Promise<void> {
    const now = Date.now();
    if (now - lastBrowsingTitlesRefresh < TITLES_THROTTLE) {
        return;
    }
    lastBrowsingTitlesRefresh = now;

    // Select classic video titles
    const classicTitles = Array.from(document.querySelectorAll('#video-title')) as HTMLElement[];

    // Select recommended video titles (new format)
    const recommendedTitles = Array.from(
        document.querySelectorAll('a.yt-lockup-metadata-view-model__title > span.yt-core-attributed-string, a.yt-lockup-metadata-view-model-wiz__title > span.yt-core-attributed-string')
    ) as HTMLElement[];

    // Merge both lists
    const browsingTitles = [...classicTitles, ...recommendedTitles];

    // Collect all video IDs that need processing
    const videosToProcess: Array<{ titleElement: HTMLElement; videoId: string; videoUrl: string; currentTitle: string }> = [];
    
    for (const titleElement of browsingTitles) {
        const processingResult = shouldProcessBrowsingElement(titleElement);
        if (!processingResult.shouldProcess || !processingResult.videoId) {
            continue;
        }
        
        const { videoId, videoUrl } = processingResult;
        
        // Skip if this video is currently being processed
        if (processingVideos.has(videoId)) {
            continue;
        }
        
        const currentTitle = titleElement.textContent || '';
        
        const processingState = checkElementProcessingState(titleElement, videoId);
        if (processingState.shouldSkip) {
            continue;
        }
        if (processingState.shouldClean) {
            titleElement.removeAttribute('ynt');
            titleElement.removeAttribute('ynt-fail');
            titleElement.removeAttribute('ynt-fail-retry');
            titleElement.removeAttribute('ynt-original');
        }
        
        videosToProcess.push({ titleElement, videoId, videoUrl: videoUrl as string, currentTitle });
    }

    // Batch fetch titles from YouTube Data API v3 if enabled
    let preferenceFetchedTitles: Map<string, string> | undefined;
    if (isYouTubeDataAPIEnabled(currentSettings) && videosToProcess.length > 0) {
        const videoIds = videosToProcess.map(v => v.videoId);
        preferenceFetchedTitles = await batchFetchTitlesFromYouTubeDataApi(videoIds);
        browsingTitlesLog(`Batch fetched ${preferenceFetchedTitles.size} titles from YouTube Data API v3`);
    }

    // Collect translated titles for batch description processing
    const translatedTitleElements: HTMLElement[] = [];
    const translatedVideoIds: string[] = [];

    // Process each video in parallel
    await Promise.all(
        videosToProcess.map(async ({ titleElement, videoId, videoUrl, currentTitle }) => {
            let isTranslated = false;
            processingVideos.add(videoId);
            try {
                const titleFetchResult = await fetchOriginalTitle(videoId, titleElement, currentTitle, preferenceFetchedTitles);
                if (titleFetchResult.shouldSkip) {
                    return;
                }
                const originalTitle = titleFetchResult.originalTitle;
                if (!originalTitle) {
                    return;
                }
                try {
                    updateBrowsingTitleElement(titleElement, originalTitle, videoId);
                    isTranslated = true;
                    if (shouldProcessSearchDescriptionElement(isTranslated)) {
                        translatedTitleElements.push(titleElement);
                        translatedVideoIds.push(videoId);
                    }
                } catch (error) {
                    browsingTitlesErrorLog(`Failed to update recommended title:`, error);
                }
            } finally {
                processingVideos.delete(videoId);
            }
        })
    );

// Batch process descriptions for all translated titles
    if (translatedTitleElements.length > 0) {
        await batchProcessSearchDescriptions(translatedTitleElements, translatedVideoIds);
    }
}