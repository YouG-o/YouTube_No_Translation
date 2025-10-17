/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */

import { chaptersLog, chaptersErrorLog } from '../../utils/logger';
import { Chapter } from '../../types/types';
import { normalizeText } from '../../utils/text';

import { updateChapterButton } from './button';
import { updateTooltipChapter } from './tooltip';
import { setupPanelsObserver } from './sidePannel';


// Global variables for cleanup
let chapterButtonObserver: MutationObserver | null = null;
let chaptersObserver: MutationObserver | null = null;
let panelsObserver: MutationObserver | null = null;
let chaptersUpdateInterval: number | null = null;

let chapterButtonDebounceTimer: number | null = null;
let chaptersDebounceTimer: number | null = null;
let panelsDebounceTimer: number | null = null;

const CHAPTER_BUTTON_DEBOUNCE_MS = 200;
const CHAPTERS_DEBOUNCE_MS = 16; // ~60fps
export const PANELS_DEBOUNCE_MS = 200;

// Setters for panels observer and timer (used in pannel.ts)
export function setPanelsObserver(observer: MutationObserver | null): void {
    panelsObserver = observer;
}

export function setPanelsDebounceTimer(timer: number | null): void {
    panelsDebounceTimer = timer;
}

export function getPanelsDebounceTimer(): number | null {
    return panelsDebounceTimer;
}

export let cachedChapters: Chapter[] = [];
let lastDescriptionHash: string = '';

// Cleanup function for chapters observer
export function cleanupChaptersObserver(): void {
    if (chaptersObserver) {
        chaptersObserver.disconnect();
        chaptersObserver = null;
    }
    
    if (chapterButtonObserver) {
        chapterButtonObserver.disconnect();
        chapterButtonObserver = null;
    }
    
    if (panelsObserver) {
        panelsObserver.disconnect();
        panelsObserver = null;
    }
    
    if (chaptersUpdateInterval) {
        clearInterval(chaptersUpdateInterval);
        chaptersUpdateInterval = null;
    }
    
    if (chapterButtonDebounceTimer !== null) {
        clearTimeout(chapterButtonDebounceTimer);
        chapterButtonDebounceTimer = null;
    }
    
    if (chaptersDebounceTimer !== null) {
        clearTimeout(chaptersDebounceTimer);
        chaptersDebounceTimer = null;
    }
    
    if (panelsDebounceTimer !== null) {
        clearTimeout(panelsDebounceTimer);
        panelsDebounceTimer = null;
    }
    
    // Remove CSS style
    const style = document.getElementById('ynt-chapters-style');
    if (style) {
        style.remove();
    }
    
    // Remove all chapter attributes
    document.querySelectorAll('[data-original-chapter]').forEach(el => {
        el.removeAttribute('data-original-chapter');
    });
    
    // Remove chapter button attributes
    document.querySelectorAll('[data-original-chapter-button]').forEach(el => {
        el.removeAttribute('data-original-chapter-button');
    });
}

// Convert time string to seconds
export function timeStringToSeconds(timeString: string): number {
    const parts = timeString.split(':').map(Number);
    if (parts.length === 2) {
        return parts[0] * 60 + parts[1]; // MM:SS
    } else if (parts.length === 3) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2]; // HH:MM:SS
    }
    return 0;
}

// Parse chapters from description text
function parseChaptersFromDescription(description: string): Chapter[] {
    const chapters: Chapter[] = [];
    // Regex: line must start with optional bullet/emoji, then timestamp, then optional separator, then title
    const chapterRegex = /^\s*([\-\–—•·▪▫‣⁃→>]*\s*)?(\d{1,2}:\d{2}(?::\d{2})?)\s+(.+)$/;

    description.split('\n').forEach(line => {
        const match = line.trim().match(chapterRegex);
        if (match) {
            const [, , timestamp, title] = match;
            // Convert timestamp to seconds
            const parts = timestamp.split(':').map(Number);
            let totalSeconds = 0;
            if (parts.length === 2) {
                totalSeconds = parts[0] * 60 + parts[1];
            } else if (parts.length === 3) {
                totalSeconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
            }
            // Clean title
            let cleanTitle = title.trim();
            // Skip if title is too short
            if (cleanTitle.length < 2) return;
            chapters.push({
                startTime: totalSeconds,
                title: cleanTitle
            });
        }
    });
    return chapters;
}

// Find chapter based on time in seconds
export function findChapterByTime(timeInSeconds: number, chapters: Chapter[]): Chapter | null {
    if (chapters.length === 0) return null;
    
    let targetChapter = chapters[0];
    for (let i = chapters.length - 1; i >= 0; i--) {
        if (timeInSeconds >= chapters[i].startTime) {
            targetChapter = chapters[i];
            break;
        }
    }
    return targetChapter;
}


// Hash function for description caching
function hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString();
}

// Get current video time from player
export function getCurrentVideoTime(): number {
    const video = document.querySelector('#movie_player video') || document.querySelector('video');
    if (video && 'currentTime' in video) {
        const time = Math.floor((video as HTMLVideoElement).currentTime);
        return time;
    }
    
    chaptersLog('Video element not found or no currentTime property');
    return 0;
}

/**
 * Checks if displayed chapters are translated by comparing them with description chapters
 * @param descriptionChapters - Chapters parsed from the original description
 * @returns true if chapters appear to be translated, false otherwise
 */
function areChaptersTranslated(descriptionChapters: Chapter[]): boolean {
    // Get displayed chapters from side panel (most reliable source)
    const openChaptersPanel = document.querySelector('ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-macro-markers-description-chapters"]');
    
    if (!openChaptersPanel) {
        // Panel doesn't exist or isn't visible - try chapter button as fallback
        //chaptersLog('Chapters panel not found, checking chapter button instead');
        
        const chapterButton = document.querySelector('.ytp-chapter-title-content');
        if (!chapterButton) {
            chaptersLog('No chapter button found, assuming chapters are not translated');
            return false;
        }
        
        const displayedTitle = chapterButton.textContent?.trim();
        if (!displayedTitle) {
            return false;
        }
        
        // Get current video time to find matching chapter
        const currentTime = getCurrentVideoTime();
        const matchingChapter = findChapterByTime(currentTime, descriptionChapters);
        
        if (!matchingChapter) {
            chaptersLog('No matching chapter found for current time');
            return false;
        }
        
        // Compare normalized titles
        const normalizedDisplayed = normalizeText(displayedTitle);
        const normalizedOriginal = normalizeText(matchingChapter.title);
        
        const isTranslated = normalizedDisplayed !== normalizedOriginal;
        
        if (isTranslated) {
            chaptersLog(`Chapter button appears translated: "${displayedTitle}" vs "${matchingChapter.title}"`);
        } else {
            chaptersLog('Chapter button title matches description, not translated');
        }
        
        return isTranslated;
    }
    
    //chaptersLog('Chapters panel found, checking panel chapters');
    
    // Get chapter elements from panel
    const chapterElements = openChaptersPanel.querySelectorAll('ytd-macro-markers-list-item-renderer h4.macro-markers');
    
    if (chapterElements.length === 0) {
        chaptersLog('No chapter elements found in panel');
        return false;
    }
    
    //chaptersLog(`Comparing ${chapterElements.length} displayed chapters with ${descriptionChapters.length} description chapters`);
    
    // Check if any displayed chapter differs from description chapter
    let translatedCount = 0;
    
    chapterElements.forEach((element: Element) => {
        const h4Element = element as HTMLElement;
        const displayedTitle = h4Element.textContent?.trim();
        
        if (!displayedTitle) return;
        
        // Find corresponding chapter by time
        const timeElement = h4Element.closest('ytd-macro-markers-list-item-renderer')?.querySelector('#time');
        const timeText = timeElement?.textContent?.trim();
        
        if (!timeText) return;
        
        const timeInSeconds = timeStringToSeconds(timeText);
        const matchingChapter = findChapterByTime(timeInSeconds, descriptionChapters);
        
        if (!matchingChapter) return;
        
        // Compare normalized titles
        const normalizedDisplayed = normalizeText(displayedTitle);
        const normalizedOriginal = normalizeText(matchingChapter.title);
        
        if (normalizedDisplayed !== normalizedOriginal) {
            translatedCount++;
            //chaptersLog(`Translated chapter found: "${displayedTitle}" vs "${matchingChapter.title}" at ${timeText}`);
        }
    });
    
    const areTranslated = translatedCount > 0;
    
    if (areTranslated) {
        //chaptersLog(`${translatedCount} chapters are translated out of ${chapterElements.length}`);
    } else {
        chaptersLog('All chapters match description, not translated');
    }
    
    return areTranslated;
}

/**
 * Checks if chapters need replacement and initializes the replacement system if needed
 * Should be called after description has been processed (replaced or verified as original)
 * @param videoId - The video ID (used for logging only)
 * @param description - The original description text
 */
export function checkAndInitializeChapters(videoId: string, description: string): void {
    chaptersLog(`Checking chapters for video ${videoId}`);
    
    if (!description) {
        chaptersLog('No description provided, cannot check chapters');
        return;
    }
    
    //chaptersLog(`Description length: ${description.length} characters`);
    
    // Wait for chapters to be rendered in the DOM
    setTimeout(() => {
        // Parse chapters from description
        const descriptionChapters = parseChaptersFromDescription(description);
        
        if (descriptionChapters.length === 0) {
            chaptersLog('No chapters found in description');
            return;
        }
        
        //chaptersLog(`Found ${descriptionChapters.length} chapters in description`);
        
        // Check if displayed chapters are translated
        const chaptersTranslated = areChaptersTranslated(descriptionChapters);
        
        if (chaptersTranslated) {
            chaptersLog('Chapters are translated, initializing replacement system');
            initializeChaptersReplacement(description);
        } else {
            chaptersLog('Chapters are already original, skipping replacement system');
        }
    }, 500); // 500ms delay to ensure chapters are rendered
}

// Initialize chapters replacement system
export function initializeChaptersReplacement(originalDescription: string): void {
    // Clean up any existing observer first
    cleanupChaptersObserver();
    
    // Cache chapters if description hasn't changed
    const descriptionHash = hashString(originalDescription);
    if (descriptionHash !== lastDescriptionHash) {
        cachedChapters = parseChaptersFromDescription(originalDescription);
        lastDescriptionHash = descriptionHash;
    }
    
    if (cachedChapters.length === 0) {
        chaptersLog('No chapters found in description');
        return;
    }
    
    //chaptersLog(`Found ${cachedChapters.length} original chapters`);
    
    // Create CSS that hides chapter title text and shows custom content
    const style = document.createElement('style');
    style.id = 'ynt-chapters-style';
    style.textContent = `
        /* Old structure: .ytp-tooltip-title span */
        .ytp-tooltip.ytp-bottom.ytp-preview .ytp-tooltip-title span {
            font-size: 0 !important;
            line-height: 0 !important;
        }
        
        .ytp-tooltip.ytp-bottom.ytp-preview .ytp-tooltip-title span[data-original-chapter]::after {
            content: attr(data-original-chapter);
            font-size: 12px !important;
            line-height: normal !important;
            color: inherit;
            font-family: inherit;
            display: inline !important;
        }
        
        /* New structure: .ytp-tooltip-progress-bar-pill-title */
        .ytp-tooltip-progress-bar-pill-title {
            font-size: 0 !important;
            line-height: 0 !important;
        }
        
        .ytp-tooltip-progress-bar-pill-title[data-original-chapter]::after {
            content: attr(data-original-chapter);
            font-size: 12px !important;
            line-height: normal !important;
            color: inherit;
            font-family: inherit;
            display: inline !important;
        }
    `;
    document.head.appendChild(style);
    
    // More targeted observer - only watch for tooltip appearances
    chaptersObserver = new MutationObserver(mutations => {
        let shouldUpdate = false;
        
        mutations.forEach(mutation => {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        const element = node as Element;
                        // More specific targeting
                        if (element.classList?.contains('ytp-tooltip') && 
                            element.classList?.contains('ytp-preview')) {
                            shouldUpdate = true;
                        }
                    }
                });
            }
            
            // Only watch for changes in tooltip text content
            if (mutation.type === 'characterData') {
                const parent = mutation.target.parentElement;
                if (parent?.classList?.contains('ytp-tooltip-text')) {
                    shouldUpdate = true;
                }
            }
        });
        
        if (shouldUpdate) {
            // Clear existing debounce timer
            if (chaptersDebounceTimer !== null) {
                clearTimeout(chaptersDebounceTimer);
            }
            
            // Set new debounce timer
            chaptersDebounceTimer = window.setTimeout(() => {
                updateTooltipChapter();
                chaptersDebounceTimer = null;
            }, CHAPTERS_DEBOUNCE_MS);
        }
    });
    
    const player = document.getElementById('movie_player');
    if (player) {
        chaptersObserver.observe(player, {
            childList: true,
            subtree: true,
            characterData: true
        });
    }
    
    // Setup chapter button observer
    setupChapterButtonObserver();
    setupPanelsObserver();
    
    // Reduced interval frequency - 200ms instead of 100ms
    chaptersUpdateInterval = setInterval(updateTooltipChapter, 200);
}


function setupChapterButtonObserver(): void {
    const chapterButton = document.querySelector('.ytp-chapter-title');
    if (!chapterButton) {
        return;
    }
    
    
    chapterButtonObserver = new MutationObserver(mutations => {
        //chaptersLog('[DEBUG] Chapter button mutation detected');
        let shouldUpdate = false;
        
        mutations.forEach(mutation => {
            if (mutation.type === 'childList' || mutation.type === 'characterData') {
                const target = mutation.target as Element;
                if (target.classList?.contains('ytp-chapter-title-content') || 
                    target.closest('.ytp-chapter-title-content')) {
                    shouldUpdate = true;
                }
            }
        });
        
        if (shouldUpdate) {
            // Clear existing debounce timer
            if (chapterButtonDebounceTimer !== null) {
                clearTimeout(chapterButtonDebounceTimer);
            }
            
            // Set new debounce timer
            chapterButtonDebounceTimer = window.setTimeout(() => {
                updateChapterButton();
                chapterButtonDebounceTimer = null;
            }, CHAPTER_BUTTON_DEBOUNCE_MS);
        }
    });
    
    chapterButtonObserver.observe(chapterButton, {
        childList: true,
        subtree: true,
        characterData: true
    });
    
    // Initial update
    updateChapterButton();
}