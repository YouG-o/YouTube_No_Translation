import { titlesLog, titlesErrorLog } from '../loggings';
import { ProcessingResult, ElementProcessingState, TitleFetchResult } from '../../types/types';
import { ensureIsolatedPlayer, cleanupIsolatedPlayer } from '../utils/isolatedPlayer';
import { currentSettings } from '../index';
import { normalizeText } from '../utils/text';
import { extractVideoIdFromUrl } from '../utils/video';
import { fetchOriginalTitle, updateBrowsingTitleElement } from './browsingTitles';


let endScreenObserver: MutationObserver | null = null;
let lastEndScreenRefresh = 0;
const END_SCREEN_THROTTLE = 2000; // Throttle to avoid too many calls

export function setupEndScreenObserver(): void {
    // Cleanup existing observer
    cleanupEndScreenObserver();
    
    const player = document.getElementById('movie_player');
    if (!player) {
        titlesLog('No player found for end screen observer');
        return;
    }
    
    endScreenObserver = new MutationObserver((mutations) => {
        let shouldRefresh = false;
        
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                const target = mutation.target as Element;
                
                // Check if element gained the show class
                if (target.classList?.contains('ytp-ce-element') && 
                    target.classList?.contains('ytp-ce-element-show')) {
                    
                    // Only trigger for video end screens (not channel ones)
                    if (target.classList?.contains('ytp-ce-video')) {
                        shouldRefresh = true;
                        titlesLog('End screen video element became visible');
                    }
                }
            }
        });
        
        if (shouldRefresh) {
            const now = Date.now();
            if (now - lastEndScreenRefresh >= END_SCREEN_THROTTLE) {
                lastEndScreenRefresh = now;
                // Small delay to ensure DOM is stable
                setTimeout(() => {
                    refreshEndScreenTitles();
                }, 100);
            }
        }
    });
    
    endScreenObserver.observe(player, {
        attributes: true,
        attributeFilter: ['class'],
        subtree: true
    });
    
    titlesLog('End screen observer initialized');
}

export function cleanupEndScreenObserver(): void {
    if (endScreenObserver) {
        endScreenObserver.disconnect();
        endScreenObserver = null;
    }
    lastEndScreenRefresh = 0;
}


// Global variables for ending suggested videos
let lastEndScreenTitleRefresh = 0;
const ENDSCREEN_TITLE_THROTTLE = 1000;
const processingEndScreenTitle = new Set<string>();


// Check if end screen title element should be processed
function shouldProcessEndScreenTitleElement(titleElement: HTMLElement): ProcessingResult {
    const linkElement = titleElement.closest('.ytp-ce-covering-overlay') as HTMLAnchorElement;
    
    if (!linkElement || !linkElement.href) {
        return { shouldProcess: false };
    }

    const videoId = extractVideoIdFromUrl(linkElement.href);
    
    if (!videoId) {
        return { shouldProcess: false };
    }

    // Skip if video is currently being processed
    if (processingEndScreenTitle.has(videoId)) {
        return { shouldProcess: false };
    }

    return { 
        shouldProcess: true, 
        videoId, 
        videoUrl: linkElement.href 
    };
}

// Check processing state for end screen elements
function checkEndScreenTitleElementProcessingState(titleElement: HTMLElement, videoId: string): ElementProcessingState {
    // Check if already processed successfully
    if (titleElement.hasAttribute('ynt')) {
        if (titleElement.getAttribute('ynt') === videoId) {
            const directTextNodes = Array.from(titleElement.childNodes)
                .filter(node => node.nodeType === Node.TEXT_NODE && node.textContent?.trim());
            
            if (directTextNodes.length === 1 && normalizeText(directTextNodes[0].textContent || '') === normalizeText(titleElement.getAttribute('title') || '')) {
                return { shouldSkip: true, shouldClean: false };
            } else {
                return { shouldSkip: false, shouldClean: true };
            }
        } else {
            return { shouldSkip: false, shouldClean: true };
        }
    }

    if (titleElement.hasAttribute('ynt-fail')) {
        if (titleElement.getAttribute('ynt-fail') === videoId) {
            return { shouldSkip: true, shouldClean: false };
        }
        titleElement.removeAttribute('ynt-fail');
    }

    if (titleElement.hasAttribute('ynt-original')) {
        if (titleElement.getAttribute('ynt-original') === videoId) {
            return { shouldSkip: true, shouldClean: false };
        }
        titleElement.removeAttribute('ynt-original');
    }

    return { shouldSkip: false, shouldClean: false };
}

// Main function to refresh ending suggested videos
export async function refreshEndScreenTitles(): Promise<void> {
    const now = Date.now();
    if (now - lastEndScreenTitleRefresh < ENDSCREEN_TITLE_THROTTLE) {
        return;
    }
    lastEndScreenTitleRefresh = now;

    const endScreenTitles = document.querySelectorAll('.ytp-ce-video-title') as NodeListOf<HTMLElement>;
    
    if (endScreenTitles.length === 0) {
        return;
    }

    titlesLog(`Found ${endScreenTitles.length} end screen video titles`);

    for (const titleElement of endScreenTitles) {
        const processingResult = shouldProcessEndScreenTitleElement(titleElement);
        if (!processingResult.shouldProcess || !processingResult.videoId) {
            continue;
        }
        
        const { videoId } = processingResult;
        
        // Mark video as being processed
        processingEndScreenTitle.add(videoId);
        
        try {
            const currentTitle = titleElement.textContent || '';

            const processingState = checkEndScreenTitleElementProcessingState(titleElement, videoId);
            if (processingState.shouldSkip) {
                continue;
            }
            if (processingState.shouldClean) {
                titleElement.removeAttribute('ynt');
                titleElement.removeAttribute('ynt-fail');
                titleElement.removeAttribute('ynt-fail-retry');
                titleElement.removeAttribute('ynt-original');
            }
            
            // Reuse the existing fetchOriginalTitle function
            const titleFetchResult = await fetchOriginalTitle(videoId, titleElement, currentTitle);
            if (titleFetchResult.shouldSkip) {
                continue;
            }

            const originalTitle = titleFetchResult.originalTitle;
            if (!originalTitle) {
                titlesErrorLog(`No original title found for video ${videoId}`);
                titleElement.setAttribute('ynt-fail', videoId);
                continue;
            }

            try {
                updateBrowsingTitleElement(titleElement, originalTitle, videoId, false);
            } catch (error) {
                titlesErrorLog(`Failed to update ending suggested title:`, error);
                titleElement.setAttribute('ynt-fail', videoId);
            }

        } finally {
            // Always remove video from processing set
            processingEndScreenTitle.delete(videoId);
        }
    }

    // Cleanup isolated players
    setTimeout(() => {
        cleanupIsolatedPlayer('ynt-player-titles');
    }, 1000);
}