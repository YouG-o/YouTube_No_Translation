/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */

import { Message } from '../../types/types';
import { coreErrorLog } from '../loggings';


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
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(channelName)}&key=${apiKey}`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.items && data.items.length > 0) {
            const channelId = data.items[0].snippet.channelId || data.items[0].id.channelId;
            return channelId || null;
        }
        return null;
    } catch (error) {
        coreErrorLog('Failed to fetch channel ID:', error);
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

    // Try to get channelId from ytInitialData as a fallback
    if (!channelId && (window as any).ytInitialData) {
        try {
            const str = JSON.stringify((window as any).ytInitialData);
            const match = str.match(/"channelId":"([a-zA-Z0-9_-]+)"/);
            if (match) {
                channelId = match[1];
            }
        } catch (e) {}
    }

    return channelId || null;
}

/**
 * Extracts the channel handle from a YouTube channel URL of the form
 * "https://www.youtube.com/@ChannelName" or "https://www.youtube.com/@ChannelName/featured".
 * Returns the handle without the "@".
 * @param url The YouTube channel URL.
 * @returns The channel handle as a string, or null if not found.
 */
export function getChannelName(url: string): string | null {
    const match = url.match(/youtube\.com\/@([^\/?#]+)/i);
    if (match && match[1]) {
        return match[1];
    }
    return null;
}