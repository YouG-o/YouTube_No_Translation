/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */

import { titlesLog, titlesErrorLog } from '../../utils/logger';
import { normalizeText } from '../../utils/text';
import { extractVideoIdFromUrl } from '../../utils/video';
import { updateBrowsingTitleElement, fetchOriginalTitle } from './browsingTitles';

// Structure to store infocard data (translated + original titles)
interface InfoCardData {
    translatedTitle: string;
    originalTitle: string;
}

/**
 * Manages infocard data (translated and original titles) for overlay teaser matching.
 */
class InfoCardDataManager {
    private dataMap = new Map<string, InfoCardData>();

    /**
     * Stores infocard data for a video.
     */
    set(videoId: string, translatedTitle: string, originalTitle: string): void {
        this.dataMap.set(videoId, { translatedTitle, originalTitle });
    }

    /**
     * Retrieves infocard data by video ID.
     */
    get(videoId: string): InfoCardData | undefined {
        return this.dataMap.get(videoId);
    }

    /**
     * Finds infocard data by translated title (normalized comparison).
     */
    findByTranslatedTitle(translatedTitle: string): InfoCardData | undefined {
        const normalizedSearch = normalizeText(translatedTitle);
        for (const [videoId, data] of this.dataMap.entries()) {
            if (normalizeText(data.translatedTitle) === normalizedSearch) {
                return data;
            }
        }
        return undefined;
    }

    /**
     * Clears all stored infocard data.
     */
    clear(): void {
        this.dataMap.clear();
        titlesLog('InfoCard data cleared');
    }

    /**
     * Returns the number of stored infocards.
     */
    size(): number {
        return this.dataMap.size;
    }
}

// Singleton instance
export const infoCardDataManager = new InfoCardDataManager();

let infoCardsDebounceTimer: number | null = null;
const INFOCARDS_DEBOUNCE_MS = 200;

/**
 * Clears the infocards debounce timer.
 */
export function cleanupInfoCardsDebounce(): void {
    if (infoCardsDebounceTimer !== null) {
        clearTimeout(infoCardsDebounceTimer);
        infoCardsDebounceTimer = null;
    }
}

/**
 * Processes all infocards in the description and stores their data.
 */
export async function refreshInfoCardsTitles(): Promise<void> {
    // Clear existing debounce timer
    if (infoCardsDebounceTimer !== null) {
        clearTimeout(infoCardsDebounceTimer);
    }

    // Set new debounce timer
    infoCardsDebounceTimer = window.setTimeout(async () => {
        const infoCardTitleElements = Array.from(
            document.querySelectorAll('ytd-structured-description-video-lockup-renderer #title')
        ) as HTMLElement[];

        if (infoCardTitleElements.length === 0) {
            return;
        }

        titlesLog(`Processing ${infoCardTitleElements.length} infocard titles`);

        // Process each infocard
        for (const titleElement of infoCardTitleElements) {
            try {
                // Find the parent link to get videoId
                const linkElement = titleElement.closest('a#text-wrapper') as HTMLAnchorElement | null;
                if (!linkElement) {
                    continue;
                }

                const videoUrl = linkElement.href;
                const videoId = extractVideoIdFromUrl(videoUrl);
                
                if (!videoId) {
                    continue;
                }

                // Skip if already processed (has ynt attribute)
                if (titleElement.hasAttribute('ynt') && titleElement.getAttribute('ynt') === videoId) {
                    continue;
                }

                // Capture the translated title BEFORE replacing it
                const translatedTitle = titleElement.textContent?.trim() || '';
                
                if (!translatedTitle) {
                    continue;
                }

                // Fetch the original title
                const titleFetchResult = await fetchOriginalTitle(videoId, titleElement, translatedTitle);
                
                if (titleFetchResult.shouldSkip || !titleFetchResult.originalTitle) {
                    continue;
                }

                const originalTitle = titleFetchResult.originalTitle;

                // Store both translated and original titles
                infoCardDataManager.set(videoId, translatedTitle, originalTitle);

                // Update the title element with the original title
                updateBrowsingTitleElement(titleElement, originalTitle, videoId, false);

                titlesLog(
                    `InfoCard stored: %c${videoId}%c - Translated: %c${normalizeText(translatedTitle)}%c → Original: %c${normalizeText(originalTitle)}%c`,
                    'color: #4ade80',
                    'color: #fca5a5',
                    'color: grey',
                    'color: #fca5a5',
                    'color: white',
                    'color: #fca5a5'
                );

            } catch (error) {
                titlesErrorLog('Error processing infocard:', error);
            }
        }

        titlesLog(`Stored ${infoCardDataManager.size()} infocard data entries`);

        infoCardsDebounceTimer = null;
    }, INFOCARDS_DEBOUNCE_MS);
}

/**
 * Cleans up all infocard-related data and timers.
 */
export function cleanupInfoCards(): void {
    cleanupInfoCardsDebounce();
    infoCardDataManager.clear();
}