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

import { cachedChapters, findChapterByTime, getCurrentVideoTime } from './chaptersIndex';

let sponsorChapterObserver: MutationObserver | null = null;

// Update chapter button with original title
export function updateChapterButton(): void {
    const chapterButton = document.querySelector('.ytp-chapter-title .ytp-chapter-title-content') as HTMLElement;
    if (!chapterButton) return;
    
    const currentTime = getCurrentVideoTime();
    const targetChapter = findChapterByTime(currentTime, cachedChapters);
    
    if (targetChapter) {
        const currentTitle = chapterButton.textContent?.trim() || '';
        const storedOriginalTitle = chapterButton.getAttribute('data-original-chapter-button') || '';
        
        // Only update if the normalized titles are different
        if (normalizeText(currentTitle) !== normalizeText(targetChapter.title)) {
            chaptersLog(`Chapter button updated: Time ${currentTime}s -> from "${currentTitle}" to "${targetChapter.title}"`);
            chapterButton.textContent = targetChapter.title;
            chapterButton.setAttribute('data-original-chapter-button', targetChapter.title);
        }
    }

    // SponsorBlock compatibility: force original title using MutationObserver
    const sponsorChapterText = document.querySelector('.ytp-chapter-title .sponsorChapterText') as HTMLElement;

    // Disconnect previous observer if any
    if (sponsorChapterObserver) {
        sponsorChapterObserver.disconnect();
        sponsorChapterObserver = null;
    }

    if (sponsorChapterText && targetChapter) {
        // Set the correct text initially
        sponsorChapterText.textContent = targetChapter.title;

        // Create a MutationObserver to keep the text original
        sponsorChapterObserver = new MutationObserver(() => {
            if (sponsorChapterText.textContent !== targetChapter.title) {
                chaptersLog(`SponsorBlock chapter text forcibly updated: Time ${currentTime}s -> "${targetChapter.title}"`);
                sponsorChapterText.textContent = targetChapter.title;
            }
        });

        sponsorChapterObserver.observe(sponsorChapterText, { childList: true, subtree: true, characterData: true });
    }
}