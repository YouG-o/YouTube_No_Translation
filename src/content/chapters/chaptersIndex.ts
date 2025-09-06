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

import { updateChapterButton } from './button';
import { updateTooltipChapter } from './tooltip';
import { setupPanelsObserver } from './pannel';


// Global variables for cleanup
let chapterButtonObserver: MutationObserver | null = null;
let chaptersObserver: MutationObserver | null = null;
let panelsObserver: MutationObserver | null = null;
let chaptersUpdateInterval: number | null = null;
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
    
    chaptersLog(`Found ${cachedChapters.length} original chapters`);
    
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
            // Debounce updates
            setTimeout(updateTooltipChapter, 16); // ~60fps instead of immediate
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
    
    chaptersLog('Optimized chapters replacement initialized with chapter button support');
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
            setTimeout(updateChapterButton, 150);
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