/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */

import { Message } from '../types/types';
import { coreErrorLog } from './logger';


export const MUTATION_THRESHOLD = 10;

export function isToggleMessage(message: unknown): message is Message {
    return (
        typeof message === 'object' &&
        message !== null &&
        'action' in message &&
        message.action === 'toggleTranslation' &&
        'feature' in message &&
        (
            message.feature === 'titles' || 
            message.feature === 'audio' || 
            message.feature === 'description' ||
            message.feature === 'subtitles'
        ) &&
        'isEnabled' in message &&
        typeof message.isEnabled === 'boolean'
    );
}


/**
 * Fetches the channel ID from a YouTube channel name using the YouTube Data API.
 * @param channelName The YouTube channel name (without @).
 * @param apiKey The YouTube Data API key.
 * @returns Promise resolving to the channel ID string, or null if not found.
 */
export async function getChannelIdFromAPI(channelName: string, apiKey: string): Promise<string | null> {
    // Use the 'channels' endpoint with 'forHandle' for a quota-efficient query (1 unit).
    const url = `https://www.googleapis.com/youtube/v3/channels?part=snippet&forHandle=${encodeURIComponent(channelName)}&key=${apiKey}`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            return null;
        }
        const data = await response.json();
        // The response for a 'forHandle' query should contain exactly one item.
        if (data.items && data.items.length > 0) {
            // The channel ID is in the 'id' field of the item.
            return data.items[0].id || null;
        }
        return null;
    } catch (error) {
        coreErrorLog('Failed to fetch channel ID from API:', error);
        return null;
    }
}

/**
 * Gets the channel ID from the DOM on channel pages.
 * @returns The channel ID string, or null if not found.
 */
export function getChannelIdFromDom(): string | null {
    // Try to get channelId from link[itemprop="url"]
    let channelId: string | null = null;
    const link = document.querySelector('link[itemprop="url"][href*="channel/"]');
    if (link && link.getAttribute('href')) {
        const match = link.getAttribute('href')!.match(/channel\/([a-zA-Z0-9_-]+)/);
        if (match) {
            channelId = match[1];
        }
    }
    return channelId || null;
}


/**
 * Fetches the channelId (UCID) using the InnerTube API by injecting a script into the page context.
 * @returns Promise resolving to the channelId string, or null if not found or on error.
 */
export async function getChannelIdFromInnerTube(handle: string): Promise<string | null> {
    const channelHandle = handle;
    if (!channelHandle) {
        coreErrorLog("Channel handle is missing.");
        return null;
    }
    return new Promise((resolve) => {
        const handleResult = (event: Event) => {
            const detail = (event as CustomEvent).detail;
            window.removeEventListener('ynt-get-channel-id-inner-tube', handleResult);
            script.remove();
            resolve(detail?.channelId ?? null);
        };

        window.addEventListener('ynt-get-channel-id-inner-tube', handleResult);

        const script = document.createElement('script');
        script.src = browser.runtime.getURL('dist/content/scripts/getChannelIdScript.js');
        script.async = true;
        script.setAttribute('data-channel-handle', channelHandle);
        document.documentElement.appendChild(script);

        // Timeout in case of no response
        setTimeout(() => {
            window.removeEventListener('ynt-get-channel-id-inner-tube', handleResult);
            script.remove();
            resolve(null);
        }, 3000);
    });
}


/**
 * Extracts the channel handle from a YouTube channel URL of the form
 * "https://www.youtube.com/@ChannelName" or "https://www.youtube.com/@ChannelName/featured".
 * Returns the handle without the "@".
 * @param url The YouTube channel URL.
 * @returns The channel handle as a string, or null if not found.
 */
export function getChannelHandle(url: string): string | null {
    const match = url.match(/youtube\.com\/@([^\/?#]+)/i);
    if (match && match[1]) {
        return match[1];
    }
    return null;
}

/**
 * Checks if the YouTube Data API feature is enabled and the API key is valid (length > 10).
 * @param settings The settings object containing youtubeDataApi config.
 * @returns True if enabled and apiKey is valid, false otherwise.
 */
export function isYouTubeDataAPIEnabled(settings: { youtubeDataApi?: { enabled?: boolean; apiKey?: string } } | null | undefined): boolean {
    return !!(
        settings &&
        settings.youtubeDataApi &&
        settings.youtubeDataApi.enabled &&
        typeof settings.youtubeDataApi.apiKey === 'string' &&
        settings.youtubeDataApi.apiKey.length > 10
    );
}