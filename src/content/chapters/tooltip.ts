/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */

import { chaptersLog, chaptersErrorLog } from '../../utils/logger';
import { normalizeText } from '../../utils/text';
import { isNewYouTubePlayer } from '../../utils/video';

import { cachedChapters, findChapterByTime, timeStringToSeconds } from './chaptersIndex';


export function updateTooltipChapter(): void {
    // Only query for visible tooltips
    const visibleTooltip = document.querySelector('.ytp-tooltip.ytp-bottom.ytp-preview:not([style*="display: none"])');
    if (!visibleTooltip) return;
    
    // Reliable detection: check if we're on the new player (Delhi UI)
    const isNewPlayer = isNewYouTubePlayer();
    
    let timeString: string | null = null;
    let titleElement: Element | null = null;
    
    if (isNewPlayer) {
        // New YouTube player (September 2025)
        const pillTimeElement = visibleTooltip.querySelector('.ytp-tooltip-progress-bar-pill-time-stamp');
        const pillTitleElement = visibleTooltip.querySelector('.ytp-tooltip-progress-bar-pill-title');
        
        if (pillTimeElement && pillTitleElement && pillTimeElement.textContent?.trim()) {
            timeString = pillTimeElement.textContent.trim();
            titleElement = pillTitleElement;
        }
    } else {
        // Old YouTube player
        const timeElement = visibleTooltip.querySelector('.ytp-tooltip-text');
        const oldTitleElement = visibleTooltip.querySelector('.ytp-tooltip-title span');
        
        if (timeElement && oldTitleElement && timeElement.textContent?.trim()) {
            timeString = timeElement.textContent.trim();
            titleElement = oldTitleElement;
        }
    }
    
    if (!titleElement || !timeString) return;
    
    const timeInSeconds = timeStringToSeconds(timeString);
    const targetChapter = findChapterByTime(timeInSeconds, cachedChapters);
    
    if (targetChapter) {
        const currentOriginalChapter = titleElement.getAttribute('data-original-chapter');
        
        if (normalizeText(currentOriginalChapter) !== normalizeText(targetChapter.title)) {
            chaptersLog(`Time: ${timeString} (${timeInSeconds}s) -> Chapter: "${targetChapter.title}"`);
            titleElement.setAttribute('data-original-chapter', targetChapter.title);
            titleElement.textContent = targetChapter.title;
        }
    }
}