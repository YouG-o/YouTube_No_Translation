/* 
* Copyright (C) 2025-present YouGo (https://github.com/youg-o)
* This program is licensed under the GNU Affero General Public License v3.0.
* You may redistribute it and/or modify it under the terms of the license.
* 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
*/


import { titlesLog, titlesErrorLog } from "../loggings";
import { getChannelName, getChannelId } from "../utils/utils";
import { currentSettings } from "../index";
import { normalizeText } from "../utils/text";


/**
 * Fetches the full channel description from the YouTube Data API using the channel ID.
 * @param channelId The YouTube channel ID.
 * @param apiKey The YouTube Data API key.
 * @returns Promise resolving to the channel description string, or null if not found.
 */
async function getOriginalChannelDescription(channelId: string, apiKey: string): Promise<string | null> {
    const url = `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${channelId}&key=${apiKey}`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.items && data.items.length > 0) {
            const description = data.items[0].snippet.description;
            return description || null;
        }
        return null;
    } catch (error) {
        titlesErrorLog('Failed to fetch channel description:', error);
        return null;
    }
}


/**
 * Returns the short channel description text displayed on the YouTube channel page.
 * @returns The short description string, or null if not found.
 */
function getShortChannelCurrentDescription(): string | null {
    // Select the preview description container
    const previewElement = document.querySelector('yt-description-preview-view-model');
    if (!previewElement) {
        return null;
    }

    // Select the span containing the visible short description
    const textSpan = previewElement.querySelector(
        '.truncated-text-wiz__truncated-text-content:not(.truncated-text-wiz__truncated-text-content--hidden-text-content) .yt-core-attributed-string'
    ) as HTMLSpanElement | null;

    if (textSpan && typeof textSpan.textContent === 'string') {
        return textSpan.textContent.trim();
    }

    return null;
}


/**
 * Returns the full channel description text displayed in the modal on the YouTube channel page.
 * @returns The full description string, or null if not found.
 */
function getFullChannelCurrentDescription(): string | null {
    // Find all dialogs and select the visible one
    const dialogs = document.querySelectorAll('ytd-popup-container tp-yt-paper-dialog');
    
    for (const dialog of dialogs) {
        const dialogElement = dialog as HTMLElement;
        // Check if this dialog is visible (no display: none)
        if (dialogElement.style.display !== 'none') {
            const descriptionContainer = dialogElement.querySelector('yt-attributed-string#description-container');
            if (descriptionContainer) {
                const textSpan = descriptionContainer.querySelector('.yt-core-attributed-string');
                if (textSpan && typeof textSpan.textContent === 'string') {
                    return textSpan.textContent.trim();
                }
            }
        }
    }
    
    return null;
}


/**
 * Determines if the channel short description should be updated by comparing it to the original full description.
 * @param originalDescription The full original channel description (from API).
 * @param shortDescription The current short description displayed on the page.
 * @returns True if the short description should be updated, false otherwise.
 */
function shouldUpdateChannelDescription(originalDescription: string | null, shortDescription: string | null): boolean {
    if (!originalDescription || !shortDescription) {
        return false;
    }
    // Compare if the short description is not a prefix of the original
    return !originalDescription.startsWith(shortDescription);
}


/**
 * Refreshes the short channel description on the YouTube channel page with the original description from the YouTube Data API if needed.
 */
export async function refreshChannelShortDescription(): Promise<void> {
    // Get the API key from current settings
    const apiKey = currentSettings?.youtubeDataApi?.apiKey;
    if (!apiKey) {
        titlesErrorLog("YouTube Data API key is missing.");
        return;
    }

    // Get the channel name from the current URL
    const channelName = getChannelName(window.location.href);
    if (!channelName) {
        titlesErrorLog("Channel name could not be extracted from URL.");
        return;
    }

    const channelId = await getChannelId(channelName, apiKey);
    if (!channelId) {
        titlesErrorLog("Channel ID could not be retrieved from YouTube Data API.");
        return;
    }

    // Fetch the original full description from the API using the channel ID
    const originalDescription = await getOriginalChannelDescription(channelId, apiKey);
    const shortDescription = getShortChannelCurrentDescription();

    // Check if update is needed
    if (shouldUpdateChannelDescription(originalDescription, shortDescription)) {
        // Select the preview description container
        const previewElement = document.querySelector('yt-description-preview-view-model');
        if (previewElement) {
            // Select the span containing the visible short description
            const textSpan = previewElement.querySelector(
                '.truncated-text-wiz__truncated-text-content:not(.truncated-text-wiz__truncated-text-content--hidden-text-content) .yt-core-attributed-string'
            ) as HTMLSpanElement | null;

            if (textSpan) {
                textSpan.textContent = originalDescription || "";
                // Mark that we updated the short description
                textSpan.setAttribute('data-original-updated', channelId);
                titlesLog("Short channel description updated with original description.");
            }
        }
    }

    // Setup modal observer if description was updated OR if it was previously updated
    const previewElement = document.querySelector('yt-description-preview-view-model');
    const textSpan = previewElement?.querySelector(
        '.truncated-text-wiz__truncated-text-content:not(.truncated-text-wiz__truncated-text-content--hidden-text-content) .yt-core-attributed-string'
    ) as HTMLSpanElement | null;
    
    if (originalDescription !== null && textSpan?.hasAttribute('data-original-updated')) {
        observeChannelDescriptionModal(originalDescription);
    }
}


let currentModalObserver: MutationObserver | null = null;

/**
 * Cleans up the channel description modal observer if it exists.
 */
export function cleanupChannelDescriptionModalObserver(): void {
    if (currentModalObserver) {
        currentModalObserver.disconnect();
        currentModalObserver = null;
        titlesLog("Channel description modal observer cleaned up.");
    }
}

function observeChannelDescriptionModal(originalDescription: string): MutationObserver {
    // Clean up any existing observer first
    cleanupChannelDescriptionModalObserver();

    // Observe the popup container for new dialogs
    const popupContainer = document.querySelector('ytd-popup-container');
    if (!popupContainer) {
        titlesErrorLog('Popup container not found.');
        throw new Error('Popup container not found.');
    }

    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (
                    node.nodeType === Node.ELEMENT_NODE &&
                    (node as HTMLElement).querySelector &&
                    (node as HTMLElement).querySelector('yt-attributed-string#description-container')
                ) {
                    const descriptionContainer = (node as HTMLElement).querySelector('yt-attributed-string#description-container') as HTMLElement;
                    if (descriptionContainer) {
                        refreshChannelFullDescription(originalDescription);
                    }
                }
            }
        }
    });

    observer.observe(popupContainer, { childList: true, subtree: true });
    currentModalObserver = observer;
    return observer;
}


/**
 * Refreshes the full channel description in the modal with the original description from the YouTube Data API if needed.
 */
async function refreshChannelFullDescription(originalDescription: string): Promise<void> {
    const fullDescription = getFullChannelCurrentDescription();

    // Check if update is needed
    if (shouldUpdateChannelDescription(originalDescription, fullDescription)) {
        // Find all dialogs and update the visible one
        const dialogs = document.querySelectorAll('ytd-popup-container tp-yt-paper-dialog');
        
        for (const dialog of dialogs) {
            const dialogElement = dialog as HTMLElement;
            // Check if this dialog is visible (no display: none)
            if (dialogElement.style.display !== 'none') {
                const descriptionContainer = dialogElement.querySelector('yt-attributed-string#description-container');
                if (descriptionContainer) {
                    const currentDescription = descriptionContainer.querySelector('.yt-core-attributed-string') as HTMLSpanElement | null;
                    if (currentDescription && normalizeText(currentDescription.textContent) !== normalizeText(originalDescription)) {
                        currentDescription.textContent = originalDescription;
                        titlesLog("Full channel description updated with original description.");
                        return;
                    }
                }
            }
        }
    }
}