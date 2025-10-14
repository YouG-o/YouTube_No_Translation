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
import { infoCardDataManager } from './infoCards';

let teaserObserver: MutationObserver | null = null;
let teaserLabelObservers = new Map<HTMLElement, MutationObserver>();
let teaserDebounceTimer: number | null = null;
const TEASER_DEBOUNCE_MS = 100;

/**
 * Checks if the teaser is currently visible.
 */
function isTeaserVisible(teaserElement: HTMLElement): boolean {
    const style = window.getComputedStyle(teaserElement);
    return style.display !== 'none' && style.visibility !== 'hidden';
}

/**
 * Updates a teaser label with the original title.
 */
function updateTeaserLabel(labelElement: HTMLElement): void {
    const translatedTitle = labelElement.textContent?.trim();
    
    if (!translatedTitle) {
        return;
    }

    // Find the original title using the translated title
    const infoCardData = infoCardDataManager.findByTranslatedTitle(translatedTitle);
    
    if (!infoCardData) {
        //titlesLog(`No matching infocard found for teaser: "${translatedTitle}"`);
        return;
    }

    const originalTitle = infoCardData.originalTitle;

    // Skip if already showing original title
    if (normalizeText(translatedTitle) === normalizeText(originalTitle)) {
        return;
    }

    // Update the teaser label with the original title
    labelElement.textContent = originalTitle;
    labelElement.setAttribute('ynt-teaser', 'true');
    labelElement.setAttribute('ynt-teaser-translated', translatedTitle); // Store translated title for verification

    titlesLog(
        `Teaser updated: %c${normalizeText(translatedTitle)}%c → %c${normalizeText(originalTitle)}%c`,
        'color: grey',
        'color: #fca5a5',
        'color: white',
        'color: #fca5a5'
    );

    // Setup observer to prevent YouTube from changing it back
    setupTeaserLabelObserver(labelElement, translatedTitle, originalTitle);
}

/**
 * Processes the teaser if it's visible and has a label.
 */
function processTeaserIfVisible(): void {
    const teaserContainer = document.querySelector('.ytp-cards-teaser') as HTMLElement;
    
    if (!teaserContainer || !isTeaserVisible(teaserContainer)) {
        return;
    }

    const teaserLabel = teaserContainer.querySelector('.ytp-cards-teaser-label') as HTMLElement;
    
    if (teaserLabel) {
        // Clean up all previous observers before processing new teaser
        cleanupAllTeaserLabelObservers();
        
        // Remove the ynt-teaser attribute to allow re-processing
        teaserLabel.removeAttribute('ynt-teaser');
        teaserLabel.removeAttribute('ynt-teaser-translated');
        
        updateTeaserLabel(teaserLabel);
    }
}

/**
 * Sets up an observer to keep the teaser label showing the original title.
 */
function setupTeaserLabelObserver(labelElement: HTMLElement, expectedTranslatedTitle: string, originalTitle: string): void {
    // Clean up any existing observer for this element
    cleanupTeaserLabelObserver(labelElement);

    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList' || mutation.type === 'characterData') {
                const currentText = labelElement.textContent?.trim() || '';
                
                // Check if the translated title stored in the attribute matches
                const storedTranslatedTitle = labelElement.getAttribute('ynt-teaser-translated') || '';
                
                // If YouTube changed it to a completely different video (new teaser), stop observing
                const currentInfoCardData = infoCardDataManager.findByTranslatedTitle(currentText);
                if (currentInfoCardData && normalizeText(currentInfoCardData.translatedTitle) !== normalizeText(expectedTranslatedTitle)) {
                    titlesLog('New teaser detected, cleaning up old observer');
                    cleanupTeaserLabelObserver(labelElement);
                    return;
                }
                
                // If YouTube changed it back to the translated title, reapply our original title
                if (normalizeText(currentText) !== normalizeText(originalTitle) && 
                    normalizeText(currentText) === normalizeText(expectedTranslatedTitle)) {
                    titlesLog('YouTube changed teaser back to translated, reverting to original');
                    labelElement.textContent = originalTitle;
                }
            }
        });
    });

    observer.observe(labelElement, {
        childList: true,
        characterData: true,
        subtree: true
    });

    teaserLabelObservers.set(labelElement, observer);
}

/**
 * Cleans up the observer for a specific teaser label.
 */
function cleanupTeaserLabelObserver(labelElement: HTMLElement): void {
    const observer = teaserLabelObservers.get(labelElement);
    if (observer) {
        observer.disconnect();
        teaserLabelObservers.delete(labelElement);
    }
}

/**
 * Cleans up all teaser label observers.
 */
function cleanupAllTeaserLabelObservers(): void {
    teaserLabelObservers.forEach((observer) => {
        observer.disconnect();
    });
    teaserLabelObservers.clear();
}

/**
 * Initializes the observer for infocard teasers in the video overlay.
 */
export function setupInfoCardTeasersObserver(): void {
    cleanupInfoCardTeasersObserver();

    const player = document.getElementById('movie_player');
    if (!player) {
        return;
    }

    teaserObserver = new MutationObserver((mutations) => {
        let shouldUpdate = false;

        mutations.forEach((mutation) => {
            // Check for added nodes (teaser appearing)
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    const element = node as Element;
                    
                    // Check if a teaser was added
                    if (element.classList?.contains('ytp-cards-teaser') ||
                        element.querySelector('.ytp-cards-teaser')) {
                        shouldUpdate = true;
                    }
                }
            });

            // Check for attribute changes (display style changing)
            if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                const target = mutation.target as HTMLElement;
                if (target.classList?.contains('ytp-cards-teaser')) {
                    // Check if teaser became visible
                    if (isTeaserVisible(target)) {
                        shouldUpdate = true;
                    }
                }
            }

            // Check for childList changes inside teaser (label appearing/changing)
            if (mutation.type === 'childList') {
                const target = mutation.target as Element;
                if (target.classList?.contains('ytp-cards-teaser-text') ||
                    target.closest('.ytp-cards-teaser')) {
                    shouldUpdate = true;
                }
            }
        });

        if (shouldUpdate) {
            // Clear existing debounce timer
            if (teaserDebounceTimer !== null) {
                clearTimeout(teaserDebounceTimer);
            }

            // Set new debounce timer
            teaserDebounceTimer = window.setTimeout(() => {
                processTeaserIfVisible();
                teaserDebounceTimer = null;
            }, TEASER_DEBOUNCE_MS);
        }
    });

    teaserObserver.observe(player, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style']
    });

    // Also try to process immediately in case teaser is already visible
    processTeaserIfVisible();

    titlesLog('InfoCard teasers observer initialized');
}

/**
 * Cleans up all teaser observers and timers.
 */
export function cleanupInfoCardTeasersObserver(): void {
    if (teaserObserver) {
        teaserObserver.disconnect();
        teaserObserver = null;
    }

    // Clean up all individual teaser label observers
    cleanupAllTeaserLabelObservers();

    if (teaserDebounceTimer !== null) {
        clearTimeout(teaserDebounceTimer);
        teaserDebounceTimer = null;
    }

    //titlesLog('InfoCard teasers observer cleaned up');
}