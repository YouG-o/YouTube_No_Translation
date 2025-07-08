/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */

import { titlesLog, titlesErrorLog } from "../loggings";
import { currentSettings } from "../index";
import { normalizeText } from "../utils/text";
import { getChannelName, getChannelIdFromDom } from "../utils/utils";

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
 * Fetches the original channel name from the YouTube Data API using the channels endpoint.
 * @param apiKey The YouTube Data API key.
 * @returns Promise resolving to the channel title string, or null if not found.
 */
export async function fetchChannelName(apiKey: string): Promise<string | null> {
    const channelId = getChannelIdFromDom();
    if (!channelId) {
        titlesErrorLog('Channel ID could not be found in the DOM.');
        return null;
    }
    const url = `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${channelId}&key=${apiKey}`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.items && data.items.length > 0) {
            const channelTitle = data.items[0].snippet.title;
            return channelTitle || null;
        }
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
    const apiKey = currentSettings?.youtubeDataApi?.apiKey;
    if (!channelHandle) {
        titlesErrorLog("Channel handle could not be extracted from URL.");
        return;
    }
    if (!apiKey) {
        titlesErrorLog("YouTube Data API key is missing.");
        return;
    }

    // Fetch the original channel name from the API
    const originalChannelName = await fetchChannelName(apiKey);

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