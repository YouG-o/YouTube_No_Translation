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

import { cachedChapters, findChapterByTime, timeStringToSeconds } from './chaptersIndex';


export function updateTooltipChapter(): void {
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
        
        if (normalizeText(currentOriginalChapter) !== normalizeText(targetChapter.title)) {
            chaptersLog(`Time: ${timeString} (${timeInSeconds}s) -> Chapter: "${targetChapter.title}"`);
            titleElement.setAttribute('data-original-chapter', targetChapter.title);
        }
    }
}