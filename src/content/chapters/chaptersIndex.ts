/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */

// Global variables for cleanup
let chaptersObserver: MutationObserver | null = null;
let chaptersUpdateInterval: number | null = null;

// Cleanup function for chapters observer
function cleanupChaptersObserver(): void {
    if (chaptersObserver) {
        chaptersObserver.disconnect();
        chaptersObserver = null;
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
}

// Convert time string to seconds
function timeStringToSeconds(timeString: string): number {
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
    
    description.split('\n').forEach(line => {
        // More flexible regex to handle emojis, bullets, and various separators
        const match = line.trim().match(/^.*?(\d{1,2}):(\d{2})(?::(\d{2}))?.*?\s*(.+)$/);
        if (match) {
            const [, minutes, seconds, hours, title] = match;
            
            // Extract clean title by removing everything before the timestamp and separators after
            let cleanTitle = title.trim();
            
            // Remove common separators at the beginning of title
            cleanTitle = cleanTitle.replace(/^[\s\-–—•·▪▫‣⁃:→>]*\s*/, '');
            
            // Skip if title is too short (likely not a real chapter)
            if (cleanTitle.length < 2) return;
            
            const totalSeconds = (hours ? parseInt(hours) * 3600 : 0) + 
                               parseInt(minutes) * 60 + 
                               parseInt(seconds);
            chapters.push({
                startTime: totalSeconds,
                title: cleanTitle.trim()
            });
        }
    });
    
    return chapters;
}

// Find chapter based on time in seconds
function findChapterByTime(timeInSeconds: number, chapters: Chapter[]): Chapter | null {
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

// Cache for parsed chapters to avoid re-parsing
let cachedChapters: Chapter[] = [];
let lastDescriptionHash: string = '';

// Optimized update function with early returns
function updateTooltipChapter(): void {
    // Only query for visible tooltips
    const visibleTooltip = document.querySelector('.ytp-tooltip.ytp-bottom.ytp-preview:not([style*="display: none"])');
    if (!visibleTooltip) return;
    
    const timeElement = visibleTooltip.querySelector('.ytp-tooltip-text');
    const titleElement = visibleTooltip.querySelector('.ytp-tooltip-title span');
    
    if (!timeElement || !titleElement) return;
    
    const timeString = timeElement.textContent?.trim();
    if (!timeString) return;
    
    const timeInSeconds = timeStringToSeconds(timeString);
    const targetChapter = findChapterByTime(timeInSeconds, cachedChapters);
    
    if (targetChapter) {
        const currentOriginalChapter = titleElement.getAttribute('data-original-chapter');
        
        if (currentOriginalChapter !== targetChapter.title) {
            chaptersLog(`Time: ${timeString} (${timeInSeconds}s) -> Chapter: "${targetChapter.title}"`);
            titleElement.setAttribute('data-original-chapter', targetChapter.title);
        }
    }
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

// Initialize chapters replacement system
function initializeChaptersReplacement(originalDescription: string): void {
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
    
    // Reduced interval frequency - 200ms instead of 100ms
    chaptersUpdateInterval = setInterval(updateTooltipChapter, 200);
    
    chaptersLog('Optimized chapters replacement initialized');
}