/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */

import { titlesLog, titlesErrorLog, coreLog } from "../../utils/logger";
import { normalizeText } from "../../utils/text";
import { getChannelName, getChannelIdFromInnerTube, getChannelIdFromDom, isYouTubeDataAPIEnabled } from "../../utils/utils";
import { currentSettings } from "../index";

/**
 * Checks if the current channel name displayed on the page should be updated.
 * @param originalChannelName The original channel name fetched from the API.
 * @param currentChannelName The current channel name displayed on the page.
 * @returns True if the channel name should be updated, false otherwise.
 */
export function shouldUpdateChannelName(originalChannelName: string | null, currentChannelName: string | null): boolean {
    if (!originalChannelName || !currentChannelName) {
        return false;
    }
    // Compare normalized names
    return normalizeText(originalChannelName) !== normalizeText(currentChannelName);
}


/**
 * Fetches the original channel name using the InnerTube API by injecting a script into the page context.
 * @returns Promise resolving to the original channel name string, or null if not found or on error.
 */
export async function fetchChannelNameInnerTube(): Promise<string | null> {
    const channelHandle = getChannelName(window.location.href);

    if (!channelHandle) {
        titlesErrorLog("Channel handle is missing.");
        return null;
    }

    const channelId = await getChannelIdFromInnerTube();
    if (!channelId) {
        titlesErrorLog("Could not retrieve channelId from API.");
        return null;
    }

    return new Promise((resolve) => {
        function handleResult(event: Event) {
            const detail = (event as CustomEvent).detail;
            window.removeEventListener('ynt-get-channel-name-inner-tube', handleResult);
            script.remove();
            resolve(detail?.channelName ?? null);
        }

        window.addEventListener('ynt-get-channel-name-inner-tube', handleResult);

        const script = document.createElement('script');
        script.src = browser.runtime.getURL('dist/content/scripts/ChannelNameInnerTubeScript.js');
        script.async = true;
        script.setAttribute('data-channel-id', channelId);
        document.documentElement.appendChild(script);

        // Timeout in case of no response
        setTimeout(() => {
            window.removeEventListener('ynt-get-channel-name-inner-tube', handleResult);
            script.remove();
            resolve(null);
        }, 3000);
    });
}


/**
// ...existing code...
 * @param apiKey The YouTube Data API key.
 * @returns Promise resolving to the channel title string, or null if not found.
 */
export async function fetchChannelNameDataAPI(): Promise<string | null> {
    const apiKey = currentSettings?.youtubeDataApi?.apiKey;
    if (!apiKey) {
        coreLog("API key is not set in current settings.");
        return null;
    }
    let apiUrl = '';
    const channelHandle = getChannelName(window.location.href);
    
    if (channelHandle) {
        // If the channel name is found in the DOM, build the URL to query by ID.
        apiUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet&forHandle=${encodeURIComponent(channelHandle)}&key=${apiKey}`;
    } else {
        titlesErrorLog("Channel handle is missing.");
        return null;
    }

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            titlesErrorLog(`API request failed with status: ${response.status}`);
            return null;
        }
        const data = await response.json();
        if (data.items && data.items.length > 0) {
            // The channel title is in the 'snippet.title' field.
            const channelTitle = data.items[0].snippet.title;
            return channelTitle || null;
        }
        titlesErrorLog("No items found in API response.");
        return null;
    } catch (error) {
        titlesErrorLog('Failed to fetch channel name:', error);
        return null;
    }
}

/**
 * Refreshes the channel name displayed on the page with the original channel name from the YouTube Data API if needed.
 */
export async function refreshMainChannelName(): Promise<void> {
    // Extract channel handle from current URL
    const channelHandle = getChannelName(window.location.href);
    if (!channelHandle) {
        titlesErrorLog("Channel handle could not be extracted from URL.");
        return;
    }

    // Fetch the original channel name from the API
    let originalChannelName = null;

    if (isYouTubeDataAPIEnabled(currentSettings)) {
        originalChannelName = await fetchChannelNameDataAPI();
    } else {
        originalChannelName = await fetchChannelNameInnerTube();
    }

    // Select the channel name element in the new YouTube layout
    const channelNameElement = document.querySelector('yt-dynamic-text-view-model h1.dynamic-text-view-model-wiz__h1 > span.yt-core-attributed-string') as HTMLElement | null;
    if (!channelNameElement) {
        titlesErrorLog("Channel name element not found on the page.");
        return;
    }

    const currentChannelName = channelNameElement.childNodes[0]?.textContent?.trim() || channelNameElement.textContent?.trim() || null;

    // Check if update is needed
    if (shouldUpdateChannelName(originalChannelName, currentChannelName)) {
        // Only replace the text node, not the icons or other elements
        if (channelNameElement.childNodes.length > 0 && channelNameElement.childNodes[0].nodeType === Node.TEXT_NODE) {
            channelNameElement.childNodes[0].textContent = originalChannelName || "";
        } else {
            channelNameElement.textContent = originalChannelName || "";
        }
        titlesLog("Channel name updated with original channel name from API.");
    }
}