/* 
* Copyright (C) 2025-present YouGo (https://github.com/youg-o)
* This program is licensed under the GNU Affero General Public License v3.0.
* You may redistribute it and/or modify it under the terms of the license.
* 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
*/


import { descriptionLog, descriptionErrorLog } from "../../utils/logger";
import { getChannelName, getChannelIdFromDom, getChannelIdFromInnerTube, isYouTubeDataAPIEnabled } from "../../utils/utils";
import { normalizeText } from "../../utils/text";
import { currentSettings } from "../index";


/**
 * Fetches the original channel description using the InnerTube API by injecting a script into the page context.
 * @returns Promise resolving to the original channel description string, or null if not found or on error.
 */
export async function getOriginalChannelDescriptionInnerTube(channelId: string): Promise<string | null> {

    return new Promise((resolve) => {
        function handleResult(event: Event) {
            const detail = (event as CustomEvent).detail;
            window.removeEventListener('ynt-get-channel-description-inner-tube', handleResult);
            script.remove();
            resolve(detail?.channelDescription ?? null);
        }

        window.addEventListener('ynt-get-channel-description-inner-tube', handleResult);

        const script = document.createElement('script');
        script.src = browser.runtime.getURL('dist/content/scripts/ChannelDescriptionInnerTube.js');
        script.async = true;
        script.setAttribute('data-channel-id', channelId);
        document.documentElement.appendChild(script);

        // Timeout in case of no response
        setTimeout(() => {
            window.removeEventListener('ynt-get-channel-description-inner-tube', handleResult);
            script.remove();
            resolve(null);
        }, 3000);
    });
}


/**
 * Fetches the full channel description from the YouTube Data API using the channel ID or handle.
 * @param identifier Object containing either the channel ID or handle.
 * @returns Promise resolving to the channel description string, or null if not found.
 */
async function getOriginalChannelDescriptionDataAPI(identifier: { id?: string; handle?: string }): Promise<{ id: string; description: string } | null> {
    const apiKey = currentSettings?.youtubeDataApi?.apiKey;
    let url = '';
    
    // Use provided identifier first, fallback to URL handle
    if (identifier.handle) {
        url = `https://www.googleapis.com/youtube/v3/channels?part=snippet&forHandle=${encodeURIComponent(identifier.handle)}&key=${apiKey}`;
    } else if (identifier.id) {
        url = `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${identifier.id}&key=${apiKey}`;
    } else {
        descriptionErrorLog("No channel ID or handle provided for YouTube Data API request.");
        return null;
    }

    try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.items && data.items.length > 0) {
            const item = data.items[0];
            const description = item.snippet.description;
            const id = item.id;
            return { id, description };
        }
        return null;
    } catch (error) {
        descriptionErrorLog('Failed to fetch channel description:', error);
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
    if (!originalDescription) {
        descriptionLog("Original description is null, no update needed.");
        return false;
    }
    if (normalizeText(originalDescription).startsWith(normalizeText(shortDescription))) {
        descriptionLog("Channel's description already original, no update needed.");
        return false;
    } else {
        //descriptionLog("Channel's description is translated, updating to original.");
        return true;
    }
}


/**
 * Refreshes the short channel description on the YouTube channel page with the original description from the YouTube Data API if needed.
 */
export async function refreshChannelShortDescription(): Promise<void> {
    //ChannelID is null waiting for a reliable way to get it from the DOM
    let channelId = null;
    let originalDescriptionData: { id: string; description: string } | null = null;
    
    // Try Data API only if enabled
    if (isYouTubeDataAPIEnabled(currentSettings)) {
        const apiKey = currentSettings?.youtubeDataApi?.apiKey;
        if (!apiKey) {
            descriptionErrorLog("YouTube Data API key is missing.");
            return;
        }
        if (channelId) {
            originalDescriptionData = await getOriginalChannelDescriptionDataAPI({ id: channelId });
        } else {
            const channelHandle = getChannelName(window.location.href);
            if (channelHandle) {
                originalDescriptionData = await getOriginalChannelDescriptionDataAPI({ handle: channelHandle });
            } else {
                channelId = await getChannelIdFromInnerTube();
                if (channelId) {
                    originalDescriptionData = await getOriginalChannelDescriptionDataAPI({ id: channelId });
                }
            }
        }
    }

    let finalChannelId: string | null = null;
    let originalDescription: string | null = null;

    // Use Data API result if available, otherwise use InnerTube (default method if no Data API)
    if (originalDescriptionData?.description) {
        finalChannelId = originalDescriptionData.id;
        originalDescription = originalDescriptionData.description;
    } else {
        if (!channelId) {
            channelId = await getChannelIdFromInnerTube();
        }
        if (!channelId) {
            descriptionErrorLog("Channel ID could not be retrieved from InnerTube.");
            return;
        }
        originalDescription = await getOriginalChannelDescriptionInnerTube(channelId);
        if (!originalDescription) {
            descriptionErrorLog("Could not fetch original channel description from InnerTube.");
            return;
        }
        finalChannelId = channelId;
    }

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
                textSpan.setAttribute('data-original-updated', finalChannelId);
                descriptionLog("Short channel description updated with original description.");
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
        descriptionLog("Channel description modal observer cleaned up.");
    }
}

function observeChannelDescriptionModal(originalDescription: string): MutationObserver {
    // Clean up any existing observer first
    cleanupChannelDescriptionModalObserver();

    // Observe the popup container for new dialogs
    const popupContainer = document.querySelector('ytd-popup-container');
    if (!popupContainer) {
        descriptionErrorLog('Popup container not found.');
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
                        descriptionLog("Full channel description updated with original description.");
                        return;
                    }
                }
            }
        }
    }
}